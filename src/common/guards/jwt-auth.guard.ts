import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { IJwtService } from '../../auth/domain/interfaces/jwt.interface';
import { JWT_SERVICE_TOKEN } from '../constants';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    @Inject(JWT_SERVICE_TOKEN) private readonly jwtService: IJwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user: {
          id: string;
          email: string;
          tenantId: string;
          roles: string[];
          permissions: string[];
          serviceType: 'marketplace' | 'logistics' | 'marketing';
          features: Record<string, any>;
          securityContext?: {
            lastPasswordChange: Date;
            lastLoginAttempt: Date;
            loginAttempts: number;
            securityLevel: 'high' | 'medium' | 'low';
          };
        };
        audit: {
          userId: string;
          tenantId: string;
          timestamp: Date;
          tokenExp: Date;
          sessionId: string;
          deviceInfo?: {
            ip: string;
            userAgent: string;
            deviceId?: string;
          };
        };
      }
    >();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }

    try {
      // Verificar si el token está en la lista negra
      const isBlacklisted = await this.jwtService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revocado');
      }

      // Verificar si el token ha expirado
      const isExpired = await this.jwtService.isTokenExpired(token);
      if (isExpired) {
        throw new UnauthorizedException('Token expirado');
      }

      // Verificar el token y obtener el payload tipado
      const payload = await this.jwtService.verifyToken(token);

      // Verificar estado del usuario y tenant
      if (payload.status !== 'active') {
        throw new UnauthorizedException(`Usuario ${payload.status}`);
      }

      if (payload.tenant_status !== 'active') {
        throw new UnauthorizedException(`Tenant ${payload.tenant_status}`);
      }

      // Verificar MFA si está habilitado
      if (payload.mfa_enabled && !payload.mfa_verified) {
        throw new UnauthorizedException('Se requiere verificación MFA');
      }

      // Verificar el tipo de servicio requerido
      const requiredService = this.reflector.get<
        'marketplace' | 'logistics' | 'marketing'
      >('serviceType', context.getHandler());

      if (requiredService && payload.serviceType !== requiredService) {
        throw new UnauthorizedException(
          `Servicio no autorizado: ${payload.serviceType}`,
        );
      }

      // Verificar roles requeridos
      const requiredRoles = this.reflector.get<string[]>(
        'roles',
        context.getHandler(),
      );
      if (
        requiredRoles &&
        !requiredRoles.some((role) => payload.roles.includes(role))
      ) {
        this.logger.warn(
          `Acceso denegado - Roles insuficientes para ${request.path}`,
          {
            userId: payload.sub,
            requiredRoles,
            userRoles: payload.roles,
          },
        );
        throw new UnauthorizedException('Roles insuficientes');
      }

      // Verificar permisos requeridos
      const requiredPermissions = this.reflector.get<string[]>(
        'permissions',
        context.getHandler(),
      );
      if (
        requiredPermissions &&
        !requiredPermissions.some((perm) => payload.permissions.includes(perm))
      ) {
        this.logger.warn(
          `Acceso denegado - Permisos insuficientes para ${request.path}`,
          {
            userId: payload.sub,
            requiredPermissions,
            userPermissions: payload.permissions,
          },
        );
        throw new UnauthorizedException('Permisos insuficientes');
      }

      // Verificar claims específicos del token
      const expectedClaims = this.reflector.get('claims', context.getHandler());
      if (expectedClaims) {
        const claimsValid = await this.jwtService.validateTokenClaims(
          token,
          expectedClaims,
        );
        if (!claimsValid) {
          throw new UnauthorizedException('Claims del token inválidos');
        }
      }

      // Verificar metadata del token
      const metadata = this.jwtService.getTokenMetadata(token);
      if (
        metadata.issuer !==
          (this.configService.get('JWT_ISSUER') || 'ecommerce-api') ||
        !metadata.audience.includes(
          this.configService.get('JWT_AUDIENCE') || 'api.ecommerce.com',
        )
      ) {
        throw new UnauthorizedException('Metadata del token inválida');
      }

      // Enriquecer el request con la información del usuario
      request.user = {
        id: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles,
        permissions: payload.permissions,
        serviceType: payload.serviceType,
        features: payload.features,
        securityContext: payload.securityContext,
      };

      // Agregar información de auditoría
      request.audit = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        timestamp: new Date(),
        tokenExp: this.jwtService.getTokenExpiration(token),
        sessionId: payload.sessionId || crypto.randomUUID(),
        deviceInfo: payload.deviceInfo,
      };

      return true;
    } catch (error) {
      this.logger.error('Error de autenticación JWT:', {
        path: request.path,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        message: 'Token inválido',
        error: error.message,
        details: {
          type: error.name,
          service: error?.serviceType,
          tenant: error?.tenantId,
        },
      });
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
