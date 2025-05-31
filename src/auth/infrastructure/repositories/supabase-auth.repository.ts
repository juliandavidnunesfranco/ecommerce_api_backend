import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/services/supabase.service';
import {
  IAuthRepository,
  CreateUserData,
  CreateTenantData,
} from '../../domain/interfaces/auth-repository.interface';
import { IUser } from '../../domain/interfaces/user.interface';
import { ITenant } from '../../domain/interfaces/tenant.interface';

@Injectable()
export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findUserByEmail(email: string): Promise<IUser | null> {
    const { data: user, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      mfaEnabled: user.mfa_enabled,
      status: user.status,
      hashedPassword: user.hashed_password,
      passwordChangedAt: new Date(user.password_changed_at),
      lastSignInAt: user.last_sign_in_at
        ? new Date(user.last_sign_in_at)
        : undefined,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
    };
  }

  async createUser(userData: CreateUserData): Promise<IUser> {
    const { data: user, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .insert({
        email: userData.email,
        hashed_password: userData.hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone_number: userData.phoneNumber,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create user');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      mfaEnabled: user.mfa_enabled,
      status: user.status,
      hashedPassword: user.hashed_password,
      passwordChangedAt: new Date(user.password_changed_at),
      lastSignInAt: user.last_sign_in_at
        ? new Date(user.last_sign_in_at)
        : undefined,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
    };
  }

  async updateLastSignIn(userId: string): Promise<void> {
    await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', userId);
  }

  async getUserTenants(userId: string): Promise<ITenant[]> {
    const { data: tenants } = await this.supabaseService
      .getAdminClient()
      .from('tenant_users')
      .select(
        `
        tenants (
          id,
          name,
          slug,
          features,
          settings,
          status,
          created_at,
          updated_at
        )
      `,
      )
      .eq('user_id', userId);

    return (
      tenants?.map((t) => {
        const tenant = Array.isArray(t.tenants) ? t.tenants[0] : t.tenants;
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          features: tenant.features,
          settings: tenant.settings,
          status: tenant.status,
          createdAt: new Date(tenant.created_at),
          updatedAt: new Date(tenant.updated_at),
        };
      }) || []
    );
  }

  async createTenant(tenantData: CreateTenantData): Promise<ITenant> {
    // Verificar que el slug no exista
    const { data: existingTenant } = await this.supabaseService
      .getAdminClient()
      .from('tenants')
      .select('id')
      .eq('slug', tenantData.slug)
      .single();

    if (existingTenant) {
      throw new Error('Tenant slug already exists');
    }

    const { data: tenant, error } = await this.supabaseService
      .getAdminClient()
      .from('tenants')
      .insert({
        name: tenantData.name,
        slug: tenantData.slug,
        features: tenantData.features || {},
        settings: tenantData.settings || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create tenant');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      features: tenant.features,
      settings: tenant.settings,
      status: tenant.status,
      createdAt: new Date(tenant.created_at),
      updatedAt: new Date(tenant.updated_at),
    };
  }

  async associateUserToTenant(userId: string, tenantId: string): Promise<void> {
    await this.supabaseService.getAdminClient().from('tenant_users').insert({
      tenant_id: tenantId,
      user_id: userId,
    });
  }

  async createTenantSchema(tenantId: string): Promise<void> {
    await this.supabaseService
      .getAdminClient()
      .rpc('create_tenant_schema', { tenant_id: tenantId });
  }

  async assignAdminRole(userId: string, tenantId: string): Promise<void> {
    const { data: adminRole } = await this.supabaseService
      .getAdminClient()
      .from('roles')
      .select('id')
      .eq('name', 'tenant_admin')
      .eq('tenant_id', tenantId)
      .single();

    if (adminRole) {
      await this.supabaseService.getAdminClient().from('user_roles').insert({
        user_id: userId,
        role_id: adminRole.id,
        tenant_id: tenantId,
      });
    }
  }
}
