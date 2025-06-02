import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    const supabaseOptions = this.configService.get('supabase.options');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', {
        url: supabaseUrl,
        anonKey: !!supabaseAnonKey,
        serviceKey: !!supabaseServiceKey,
      });
      throw new HttpException(
        'Missing Supabase configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    console.log('Initializing Supabase with URL:', supabaseUrl);

    try {
      // Cliente para operaciones normales
      this.supabase = createClient(
        supabaseUrl,
        supabaseAnonKey,
        supabaseOptions,
      );

      // Cliente admin para operaciones que requieren permisos elevados
      this.adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        ...supabaseOptions,
        db: {
          schema: 'public',
        },
      });

      // Verificar la conexión
      void this.verifyConnection();
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
      throw new HttpException(
        'Failed to initialize Supabase client',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async verifyConnection() {
    try {
      const { error } = await this.adminSupabase
        .from('users')
        .select('count')
        .limit(1);
      if (error) {
        console.error('Error verifying Supabase connection:', error);
        throw new HttpException(
          'Failed to verify Supabase connection',
          HttpStatus.BAD_REQUEST,
          { cause: error },
        );
      } else {
        console.log('Supabase connection verified successfully');
      }
    } catch (error) {
      console.error('Failed to verify Supabase connection:', error);
      throw new HttpException(
        'Failed to connect to Supabase client',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: error },
      );
    }
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
      throw new HttpException(
        'Failed to set Supabase context',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: error },
      );
    }
  }
}
