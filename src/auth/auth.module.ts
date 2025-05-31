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

import { JwtServiceProvider } from './infrastructure/services/nestjs-jwt.service';
import { JWT_SERVICE_TOKEN } from '../common/constants';

// Interfaces
//import { IAuthRepository } from './domain/interfaces/auth-repository.interface';
//import { IPasswordService } from './domain/interfaces/password.interface';
//import { IJwtService } from './domain/interfaces/jwt.interface';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    CreateTenantUseCase,
    NestJsJwtService,

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
    {
      provide: JWT_SERVICE_TOKEN,
      useExisting: NestJsJwtService,
    },
  ],
  exports: [
    RegisterUserUseCase,
    LoginUserUseCase,
    CreateTenantUseCase,
    'IJwtService',
    JwtServiceProvider,
    JWT_SERVICE_TOKEN,
  ],
})
export class AuthModule {}
