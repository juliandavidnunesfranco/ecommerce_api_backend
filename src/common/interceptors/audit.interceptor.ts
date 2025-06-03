import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    return next.handle().pipe(
      tap(async () => {
        if (!this.configService.get<boolean>('audit.enabled')) {
          return;
        }

        const auditData = {
          user_id: request.user?.id,
          tenant_id: request.tenant?.id,
          action: `${request.method} ${request.url}`,
          resource: request.url,
          method: request.method,
          params: request.params,
          query: request.query,
          body: request.body,
          ip_address: request.ip,
          user_agent: request.headers['user-agent'],
          timestamp: new Date(),
          duration_ms: Date.now() - now,
        };

        const client = this.supabaseService.getAdminClient();
        const schema =
          this.configService.get<string>('audit.schema') ?? 'public';

        await client
          .schema(schema)
          .from('audit_logs')
          .insert(auditData)
          .select();
      }),
    );
  }
}
