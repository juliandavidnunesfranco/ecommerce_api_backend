// Tipos para el payload
export interface JwtPayload {
  sub: string; // ID del usuario
  email: string;
  tenantId: string; // ID del tenant
  roles: string[]; // Roles del usuario
  permissions: string[]; // Permisos específicos
  serviceType: 'marketplace' | 'logistics' | 'marketing'; // Tipo de servicio
  iat?: number; // Issued at
  exp?: number; // Expiration time
  status: 'active' | 'inactive' | 'suspended'; // Estado del usuario
  mfa_enabled: boolean;
  mfa_verified?: boolean; // Indica si la MFA fue verificada en esta sesión
  tenant_status: 'active' | 'inactive' | 'suspended';
  features: Record<string, any>;
  sessionId?: string; // ID único de sesión
  deviceInfo?: {
    ip: string;
    userAgent: string;
    deviceId?: string;
  };
  securityContext?: {
    lastPasswordChange: Date;
    lastLoginAttempt: Date;
    loginAttempts: number;
    securityLevel: 'high' | 'medium' | 'low';
  };
}

// Tipos para refresh token
export interface RefreshTokenPayload {
  sub: string;
  tokenFamily: string; // Para invalidar familias completas de tokens
  tenantId: string;
  exp?: number;
  iat?: number;
  sessionId: string; // Debe coincidir con el access token
  tokenVersion: number; // Para invalidación en cascada
  deviceInfo?: {
    ip: string;
    deviceId?: string;
  };
}

// Opciones de generación de token
export interface TokenOptions {
  expiresIn?: string | number;
  audience?: string[];
  issuer?: string;
  notBefore?: string | number;
  subject?: string;
  jwtid?: string; // Identificador único del token
  algorithm?: string; // Algoritmo de firma
  keyid?: string; // Identificador de la clave de firma
}

// Interfaz principal
export interface IJwtService {
  // Generación de tokens
  generateToken(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
    options?: TokenOptions,
  ): Promise<string>;

  generateRefreshToken(
    userId: string,
    tenantId: string,
    sessionId: string,
    deviceInfo?: { ip: string; deviceId?: string },
  ): Promise<string>;

  // Verificación de tokens
  verifyToken(token: string): Promise<JwtPayload>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;

  // Gestión de tokens
  invalidateToken(token: string, reason?: string): Promise<void>;
  invalidateAllUserTokens(userId: string, tenantId: string): Promise<void>;
  invalidateAllTenantTokens(tenantId: string): Promise<void>;
  invalidateTokenFamily(tokenFamily: string): Promise<void>;
  invalidateByDeviceId(deviceId: string): Promise<void>;

  // Validaciones específicas
  isTokenBlacklisted(token: string): Promise<boolean>;
  isTokenExpired(token: string): Promise<boolean>;
  isTokenRevoked(token: string): Promise<boolean>;
  validateTokenClaims(
    token: string,
    expectedClaims: Partial<JwtPayload>,
  ): Promise<boolean>;

  // Refresh y rotación
  refreshAccessToken(
    refreshToken: string,
    deviceInfo?: { ip: string; deviceId?: string },
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>;

  // Utilidades
  decodeToken(token: string): JwtPayload;
  getTokenExpiration(token: string): Date;
  getTokenMetadata(token: string): {
    issuer: string;
    audience: string[];
    algorithm: string;
    keyId?: string;
  };
}
