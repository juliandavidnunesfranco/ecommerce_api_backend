import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  IJwtService,
  JwtPayload,
  RefreshTokenPayload,
  TokenOptions,
} from '../../domain/interfaces/jwt.interface';
import { JWT_SERVICE_TOKEN } from '../../../common/constants';
import { Redis } from 'ioredis';

interface DeviceInfo {
  ip: string;
  userAgent: string;
  deviceId?: string;
}

@Injectable()
export class NestJsJwtService implements IJwtService {
  private readonly redis: Redis;
  private readonly logger = new Logger(NestJsJwtService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Reintentando conexión a Redis en ${delay}ms (intento ${times})`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        this.logger.error(`Error de conexión Redis: ${err.message}`);
        return true;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Error en Redis: ${error.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Conectado a Redis exitosamente');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis está listo para recibir comandos');
    });
  }

  private async ensureRedisConnection(): Promise<void> {
    if (!this.redis.status || this.redis.status !== 'ready') {
      this.logger.warn('Redis no está listo, esperando conexión...');
      await new Promise<void>((resolve) => {
        const checkConnection = () => {
          if (this.redis.status === 'ready') {
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }
  }

  private async safeRedisOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T | null> {
    try {
      await this.ensureRedisConnection();
      return await operation();
    } catch (error) {
      this.logger.error(`Error en operación Redis: ${error.message}`);
      return null;
    }
  }

  private getRedisKey(type: string, identifier: string): string {
    return `auth:${type}:${identifier}`;
  }

  async generateToken(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    options?: TokenOptions,
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const enrichedPayload = {
      ...payload,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
    };

    const defaultAudience =
      this.configService.get('JWT_AUDIENCE') || 'api.ecommerce.com';
    const defaultIssuer =
      this.configService.get('JWT_ISSUER') || 'ecommerce-api';
    const defaultExpiresIn = this.configService.get('JWT_EXPIRES_IN') || '1h';

    const jwtOptions = {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: options?.expiresIn || defaultExpiresIn,
      audience: options?.audience || [defaultAudience],
      issuer: options?.issuer || defaultIssuer,
      jwtid: options?.jwtid || crypto.randomUUID(),
      algorithm: 'HS512' as const,
    };

    // Solo agregar notBefore si está definido en las opciones
    if (options?.notBefore) {
      jwtOptions['notBefore'] = options.notBefore;
    }

    const token = await this.jwtService.signAsync(enrichedPayload, jwtOptions);

    await this.safeRedisOperation(async () => {
      await this.redis.setex(
        this.getRedisKey('session', sessionId),
        3600,
        JSON.stringify({
          userId: payload.sub,
          tenantId: payload.tenantId,
          deviceInfo: payload.deviceInfo,
          status: 'active',
        }),
      );
    });

    return token;
  }

  async generateRefreshToken(
    userId: string,
    tenantId: string,
    sessionId: string,
    deviceInfo?: { ip: string; deviceId?: string },
  ): Promise<string> {
    const tokenFamily = crypto.randomUUID();
    const tokenVersion = 1;

    const payload: RefreshTokenPayload = {
      sub: userId,
      tenantId,
      tokenFamily,
      tokenVersion,
      sessionId,
      deviceInfo,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 días
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    // Almacenar información del refresh token
    await this.redis.setex(
      this.getRedisKey('refresh_token_family', tokenFamily),
      7 * 24 * 60 * 60, // 7 días
      JSON.stringify({
        userId,
        tenantId,
        tokenVersion,
        sessionId,
        deviceInfo,
        status: 'active',
      }),
    );

    return token;
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Verificar si la sesión sigue activa
      if (!payload.sessionId) {
        throw new UnauthorizedException(
          'Token inválido: sessionId no encontrado',
        );
      }
      const sessionData = await this.redis.get(
        this.getRedisKey('session', payload.sessionId),
      );

      if (!sessionData) {
        throw new UnauthorizedException('Sesión inválida o expirada');
      }

      // Verificar si el token está revocado
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        throw new UnauthorizedException('Token revocado');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado', error);
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
        },
      );

      // Verificar familia de tokens
      const familyData = await this.redis.get(
        this.getRedisKey('refresh_token_family', payload.tokenFamily),
      );

      if (!familyData) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const { tokenVersion } = JSON.parse(familyData);
      if (tokenVersion !== payload.tokenVersion) {
        await this.invalidateTokenFamily(payload.tokenFamily);
        throw new UnauthorizedException(
          'Refresh token reusado - familia invalidada',
        );
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException(
        'Refresh token inválido o expirado',
        error,
      );
    }
  }

  async invalidateToken(token: string, reason?: string): Promise<void> {
    const payload = this.decodeToken(token);
    await this.redis.setex(
      this.getRedisKey('revoked', token),
      3600, // 1 hora
      JSON.stringify({ reason, timestamp: new Date() }),
    );

    if (payload.sessionId) {
      await this.redis.del(this.getRedisKey('session', payload.sessionId));
    }
  }

  async invalidateAllUserTokens(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    // Buscar y revocar todas las sesiones del usuario
    const sessionPattern = this.getRedisKey('session', '*');
    const keys = await this.redis.keys(sessionPattern);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (!value) continue;
      const sessionData = JSON.parse(value);
      if (sessionData.userId === userId && sessionData.tenantId === tenantId) {
        await this.redis.del(key);
      }
    }
  }

  async invalidateAllTenantTokens(tenantId: string): Promise<void> {
    const sessionPattern = this.getRedisKey('session', '*');
    const keys = await this.redis.keys(sessionPattern);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (!value) continue;
      const sessionData = JSON.parse(value);
      if (sessionData.tenantId === tenantId) {
        await this.redis.del(key);
      }
    }
  }

  async invalidateTokenFamily(tokenFamily: string): Promise<void> {
    await this.redis.del(this.getRedisKey('refresh_token_family', tokenFamily));
  }

  async invalidateByDeviceId(deviceId: string): Promise<void> {
    const sessionPattern = this.getRedisKey('session', '*');
    const keys = await this.redis.keys(sessionPattern);

    for (const key of keys) {
      const value = await this.redis.get(key);
      if (!value) continue;
      const sessionData = JSON.parse(value);
      if (sessionData.deviceInfo?.deviceId === deviceId) {
        await this.redis.del(key);
      }
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return await this.isTokenRevoked(token);
  }

  async isTokenExpired(token: string): Promise<boolean> {
    try {
      await this.verifyToken(token);
      return false;
    } catch {
      return true;
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const exists = await this.redis.exists(this.getRedisKey('revoked', token));
    return exists === 1;
  }

  async validateTokenClaims(
    token: string,
    expectedClaims: Partial<JwtPayload>,
  ): Promise<boolean> {
    const payload = await this.verifyToken(token);

    return Object.entries(expectedClaims).every(([key, value]) => {
      if (Array.isArray(value)) {
        return value.every((v) => payload[key].includes(v));
      }
      return payload[key] === value;
    });
  }

  async refreshAccessToken(
    refreshToken: string,
    deviceInfo?: DeviceInfo,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const payload = await this.verifyRefreshToken(refreshToken);

    // Incrementar versión del token
    const familyKey = this.getRedisKey(
      'refresh_token_family',
      payload.tokenFamily,
    );
    const familyValue = await this.redis.get(familyKey);
    if (!familyValue) {
      throw new UnauthorizedException('Familia de tokens no encontrada');
    }
    const familyData = JSON.parse(familyValue);
    familyData.tokenVersion += 1;
    await this.redis.setex(
      familyKey,
      7 * 24 * 60 * 60,
      JSON.stringify(familyData),
    );

    // Generar nuevos tokens
    const accessToken = await this.generateToken({
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: '', // Obtener de servicio de usuarios
      roles: [], // Obtener de servicio de usuarios
      permissions: [], // Obtener de servicio de usuarios
      serviceType: 'marketplace',
      status: 'active',
      mfa_enabled: false,
      tenant_status: 'active',
      features: {},
      deviceInfo: deviceInfo || {
        ip: 'unknown',
        userAgent: 'unknown',
        deviceId: undefined,
      },
    });

    const newRefreshToken = await this.generateRefreshToken(
      payload.sub,
      payload.tenantId,
      payload.sessionId,
      deviceInfo || payload.deviceInfo,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600, // 1 hora
    };
  }

  decodeToken(token: string): JwtPayload {
    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded !== 'object') {
      throw new UnauthorizedException('Token inválido');
    }
    return decoded as JwtPayload;
  }

  getTokenExpiration(token: string): Date {
    const decoded = this.decodeToken(token);
    return new Date((decoded.exp || 0) * 1000);
  }

  getTokenMetadata(token: string): {
    issuer: string;
    audience: string[];
    algorithm: string;
    keyId?: string;
  } {
    const decoded = this.jwtService.decode(token, { complete: true });
    if (!decoded || typeof decoded !== 'object') {
      throw new UnauthorizedException('Token inválido');
    }

    return {
      issuer: decoded.payload.iss,
      audience: Array.isArray(decoded.payload.aud)
        ? decoded.payload.aud
        : [decoded.payload.aud],
      algorithm: decoded.header.alg,
      keyId: decoded.header.kid,
    };
  }
}

// Provider para la inyección de dependencias
export const JwtServiceProvider = {
  provide: JWT_SERVICE_TOKEN,
  useClass: NestJsJwtService,
};
