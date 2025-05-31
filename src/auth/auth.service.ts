import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../common/services/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { User } from './entities/user.entity';
import { Tenant } from './entities/tenant.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: User; message: string }> {
    const { email, password, firstName, lastName, phoneNumber } = registerDto;

    // Verificar si el usuario ya existe
    const { data: existingUser } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new ConflictException('User already exists with this email');
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario en la base de datos
    const { data: user, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .insert({
        email,
        hashed_password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create user');
    }

    return {
      user: this.mapToUserEntity(user),
      message: 'User registered successfully',
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; tenants: Tenant[]; token: string }> {
    const { email, password } = loginDto;

    // Buscar usuario por email
    const { data: user, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      password,
      user.hashed_password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Obtener tenants del usuario
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
      .eq('user_id', user.id);

    // Actualizar último login
    await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generar token JWT (aquí puedes usar JWT service)
    const token = await this.generateJWT(user);

    return {
      user: this.mapToUserEntity(user),
      tenants: tenants?.map((t) => this.mapToTenantEntity(t.tenants)) || [],
      token,
    };
  }

  async createTenant(
    userId: string,
    createTenantDto: CreateTenantDto,
  ): Promise<Tenant> {
    const { name, slug, features, settings } = createTenantDto;

    // Verificar que el slug no exista
    const { data: existingTenant } = await this.supabaseService
      .getAdminClient()
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists');
    }

    // Crear tenant
    const { data: tenant, error } = await this.supabaseService
      .getAdminClient()
      .from('tenants')
      .insert({
        name,
        slug,
        features: features || {},
        settings: settings || {},
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create tenant');
    }

    // Asociar usuario al tenant
    await this.supabaseService.getAdminClient().from('tenant_users').insert({
      tenant_id: tenant.id,
      user_id: userId,
    });

    // Crear esquema del tenant usando la función de la base de datos
    await this.supabaseService
      .getAdminClient()
      .rpc('create_tenant_schema', { tenant_id: tenant.id });

    // Asignar rol de admin al usuario
    const { data: adminRole } = await this.supabaseService
      .getAdminClient()
      .from('roles')
      .select('id')
      .eq('name', 'tenant_admin')
      .eq('tenant_id', tenant.id)
      .single();

    if (adminRole) {
      await this.supabaseService.getAdminClient().from('user_roles').insert({
        user_id: userId,
        role_id: adminRole.id,
        tenant_id: tenant.id,
      });
    }

    return this.mapToTenantEntity(tenant);
  }

  private async generateJWT(user: any): Promise<string> {
    // Aquí implementarías la generación del JWT
    // Por ahora retornamos un token simple
    // eslint-disable-next-line @typescript-eslint/await-thenable
    return await `jwt-token-${user.id}`;
  }

  private mapToUserEntity(user: any): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      mfaEnabled: user.mfa_enabled,
      status: user.status,
      passwordChangedAt: new Date(user.password_changed_at),
      lastSignInAt: user.last_sign_in_at
        ? new Date(user.last_sign_in_at)
        : null,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
    };
  }

  private mapToTenantEntity(tenant: any): Tenant {
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
}
