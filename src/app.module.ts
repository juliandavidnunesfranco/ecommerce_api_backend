import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

// Módulos principales
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';

// Módulos de servicios específicos
import { MarketplaceModule } from './services/marketplace/marketplace.module';
import { LogisticsModule } from './services/logistics/logistics.module';
import { MarketingModule } from './services/marketing/marketing.module';

// Middleware, Guards, Interceptors y Filters
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AuthGuard } from './common/guards/auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

// Configuración
import configuration from './config/configuration';
import { validateConfig } from './config/validation';

@Module({
  imports: [
    // Configuración Global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
      envFilePath: ['.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('THROTTLE_TTL'),
        limit: config.get('THROTTLE_LIMIT'),
      }),
    }),

    // Tareas Programadas
    ScheduleModule.forRoot(),

    // Módulos Core
    CommonModule,
    AuthModule,
    TenantModule,
    UserModule,

    // Módulos de Servicios
    MarketplaceModule,
    LogisticsModule,
    MarketingModule,
  ],
  providers: [
    // Guards Globales
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    // Interceptor de Auditoría
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Manejador Global de Excepciones
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes({
        path: '*',
        method: RequestMethod.ALL,
      });
  }
}
