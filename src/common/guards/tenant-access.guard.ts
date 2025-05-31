import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { IAuthRepository } from '../../auth/domain/interfaces/auth-repository.interface';
import { IUser } from '../../auth/domain/interfaces/user.interface';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  private readonly logger = new Logger(TenantAccessGuard.name);

  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as IUser;
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!user || !tenantId) {
      this.logger.debug(
        'No user or tenant ID provided, skipping tenant access check',
      );
      return true; // Si no hay tenant específico, continuar
    }

    try {
      const userTenants = await this.authRepository.getUserTenants(user.id);
      const hasAccess = userTenants.some((tenant) => tenant.id === tenantId);

      if (!hasAccess) {
        this.logger.warn(
          `Access denied for user ${user.id} to tenant ${tenantId}`,
        );
        throw new ForbiddenException(
          `User does not have access to tenant ${tenantId}`,
        );
      }
      this.logger.debug(
        `Tenant access granted for user ${user.id} to tenant ${tenantId}`,
      );
      console.log('Tenant access granted:', { userId: user.id, tenantId });
      return true;
    } catch (error) {
      this.logger.error('Tenant access check failed', {
        userId: user,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ForbiddenException('Unable to verify tenant access');
    }
  }
}
