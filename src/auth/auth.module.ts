import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
// Use Cases
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';

// Infrastructure
import {
  AuthRepositoryProvider,
  SupabaseAuthRepository,
} from './infrastructure/repositories/supabase-auth.repository';
import { BcryptPasswordService } from './infrastructure/services/bcrypt-password.service';
import { NestJsJwtService } from './infrastructure/services/nestjs-jwt.service';

import { JwtServiceProvider } from './infrastructure/services/nestjs-jwt.service';
import { JWT_SERVICE_TOKEN } from '../common/constants';
import { SupabaseService } from 'src/common/services/supabase.service';

// Interfaces
//import { IAuthRepository } from './domain/interfaces/auth-repository.interface';
//import { IPasswordService } from './domain/interfaces/password.interface';
//import { IJwtService } from './domain/interfaces/jwt.interface';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        console.log('JWT Secret configured:', !!secret);
        return {
          secret,
          signOptions: { expiresIn: '1h' },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    CreateTenantUseCase,
    NestJsJwtService,
    AuthRepositoryProvider,
    SupabaseService,
    SupabaseAuthRepository,

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
    AuthRepositoryProvider,
    SupabaseService,
    SupabaseAuthRepository,
  ],
})
export class AuthModule {}
