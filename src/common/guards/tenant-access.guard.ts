import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { IAuthRepository } from '../../auth/domain/interfaces/auth-repository.interface';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'];
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!user || !tenantId) {
      return true; // Si no hay tenant específico, continuar
    }

    try {
      const userTenants = await this.authRepository.getUserTenants(user.userId);
      const hasAccess = userTenants.some((tenant) => tenant.id === tenantId);

      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this tenant');
      }

      console.log('Tenant access granted:', { userId: user.userId, tenantId });
      return true;
    } catch (error) {
      console.error('Tenant access check failed:', error);
      throw new ForbiddenException('Access denied to this tenant');
    }
  }
}
