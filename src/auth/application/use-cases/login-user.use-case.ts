import { Injectable, Inject } from '@nestjs/common';
import { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { IPasswordService } from '../../domain/interfaces/password.interface';
import { IJwtService } from '../../domain/interfaces/jwt.interface';
import { Email } from '../../domain/value-objects/email.vo';
import { User } from '../../domain/entities/user.entity';
import { Tenant } from '../../domain/entities/tenant.entity';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
    @Inject('IJwtService')
    private readonly jwtService: IJwtService,
  ) {}

  async execute(loginData: {
    email: string;
    password: string;
  }): Promise<{ user: User; tenants: Tenant[]; token: string }> {
    const email = new Email(loginData.email);

    // Buscar usuario
    const userData = await this.authRepository.findUserByEmail(
      email.toString(),
    );
    if (!userData) {
      throw new Error('Invalid credentials');
    }

    // Verificar contraseña
    const isPasswordValid = await this.passwordService.compare(
      loginData.password,
      userData.hashedPassword,
    );
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Crear entidad de usuario
    const user = new User(
      userData.id,
      email,
      userData.firstName,
      userData.lastName,
      userData.phoneNumber,
      userData.mfaEnabled,
      userData.status,
      userData.passwordChangedAt,
      userData.lastSignInAt,
      userData.createdAt,
      userData.updatedAt,
    );

    if (!user.isActive()) {
      throw new Error('User account is not active');
    }

    // Obtener tenants del usuario
    const tenantsData = await this.authRepository.getUserTenants(user.id);
    const tenants = tenantsData.map(
      (t) =>
        new Tenant(
          t.id,
          t.name,
          t.slug,
          t.features,
          t.settings,
          t.status,
          t.createdAt,
          t.updatedAt,
        ),
    );

    // Actualizar último login
    await this.authRepository.updateLastSignIn(user.id);

    // Generar token JWT
    const token = await this.jwtService.generateToken({
      sub: user.id,
      email: user.email.toString(),
      tenantId: tenants[0]?.id || '',
      roles: [],
      permissions: [],
      serviceType: 'marketplace',
      status: user.status as 'active' | 'inactive' | 'suspended',
      mfa_enabled: user.mfaEnabled,
      tenant_status: (tenants[0]?.status || 'inactive') as
        | 'active'
        | 'inactive'
        | 'suspended',
      features: tenants[0]?.features || {},
    });

    return { user, tenants, token };
  }
}
