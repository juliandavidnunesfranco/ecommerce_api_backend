import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID is required');
    }

    const client = this.supabaseService.getAdminClient();

    const { data: tenant, error } = await client
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new UnauthorizedException('Invalid tenant ID');
    }

    // Verificar si el servicio está habilitado para este tenant
    const serviceType = tenant.service_type;
    const isServiceEnabled = this.configService.get<boolean>(
      `services.${serviceType}.enabled`,
    );

    if (!isServiceEnabled) {
      throw new UnauthorizedException(
        `Service ${serviceType} is not enabled for this tenant`,
      );
    }

    // Almacenar el tenant en el request para uso posterior
    request.tenant = tenant;

    return true;
  }
}
