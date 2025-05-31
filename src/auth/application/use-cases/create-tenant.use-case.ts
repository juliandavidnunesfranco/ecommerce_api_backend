import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { Tenant } from '../../domain/entities/tenant.entity';

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(
    userId: string,
    tenantData: {
      name: string;
      slug: string;
      features?: Record<string, any>;
      settings?: Record<string, any>;
    },
  ): Promise<Tenant> {
    // Crear tenant
    const tenantResult = await this.authRepository.createTenant({
      name: tenantData.name,
      slug: tenantData.slug,
      features: tenantData.features || {},
      settings: tenantData.settings || {},
    });

    // Asociar usuario al tenant
    await this.authRepository.associateUserToTenant(userId, tenantResult.id);

    // Crear esquema del tenant
    await this.authRepository.createTenantSchema(tenantResult.id);

    // Asignar rol de admin
    await this.authRepository.assignAdminRole(userId, tenantResult.id);

    return new Tenant(
      tenantResult.id,
      tenantResult.name,
      tenantResult.slug,
      tenantResult.features,
      tenantResult.settings,
      tenantResult.status,
      tenantResult.createdAt,
      tenantResult.updatedAt,
    );
  }
}
