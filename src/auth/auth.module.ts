import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';

// Use Cases
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';

// Infrastructure
import { SupabaseAuthRepository } from './infrastructure/repositories/supabase-auth.repository';
import { BcryptPasswordService } from './infrastructure/services/bcrypt-password.service';
import { NestJsJwtService } from './infrastructure/services/nestjs-jwt.service';

// Interfaces
import { IAuthRepository } from './domain/interfaces/auth-repository.interface';
import { IPasswordService } from './domain/interfaces/password.interface';
import { IJwtService } from './domain/interfaces/jwt.interface';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    CreateTenantUseCase,

    // Infrastructure Services
    {
      provide: 'IAuthRepository',
      useClass: SupabaseAuthRepository,
    },
    {
      provide: 'IPasswordService',
      useClass: BcryptPasswordService,
    },
    {
      provide: 'IJwtService',
      useClass: NestJsJwtService,
    },
  ],
  exports: [
    RegisterUserUseCase,
    LoginUserUseCase,
    CreateTenantUseCase,
    'IJwtService',
  ],
})
export class AuthModule {}
