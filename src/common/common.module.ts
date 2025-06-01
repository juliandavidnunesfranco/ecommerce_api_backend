import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './services/supabase.service';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { AuthGuard } from './guards/auth.guard';
import supabaseConfig from '../config/supabase.config';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [ConfigModule.forFeature(supabaseConfig), AuthModule],
  providers: [
    SupabaseService,
    TenantContextMiddleware,
    JwtAuthGuard,
    TenantAccessGuard,
    AuthGuard,
    SupabaseService,
  ],
  exports: [
    SupabaseService,
    TenantContextMiddleware,
    JwtAuthGuard,
    TenantAccessGuard,
    AuthGuard,
    SupabaseService,
  ],
})
export class CommonModule {}
