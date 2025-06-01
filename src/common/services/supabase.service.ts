import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private adminSupabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseAnonKey = this.configService.get<string>('supabase.anonKey');
    const supabaseServiceKey = this.configService.get<string>(
      'supabase.serviceRoleKey',
    );

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Cliente para operaciones normales
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      db: {
        schema: 'public',
      },
    });

    // Cliente admin para operaciones que requieren permisos elevados
    this.adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      db: {
        schema: 'public',
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    return this.adminSupabase;
  }

  // Método para establecer el contexto de usuario y tenant
  async setContext(userId: string, tenantId?: string): Promise<void> {
    try {
      if (userId) {
        await this.adminSupabase.rpc('set_config', {
          parameter: 'app.current_user_id',
          value: userId,
        });
      }

      if (tenantId) {
        await this.adminSupabase.rpc('set_config', {
          parameter: 'app.current_tenant_id',
          value: tenantId,
        });
      }
    } catch (error) {
      console.error('Error setting Supabase context:', error);
    }
  }
}
