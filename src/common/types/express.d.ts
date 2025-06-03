declare global {
  namespace Express {
    interface Request {
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
  }
}
