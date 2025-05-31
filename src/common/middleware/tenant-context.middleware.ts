import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly supabaseService: SupabaseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.userId;

    console.log('TenantContextMiddleware - Setting context:', {
      userId,
      tenantId,
    });

    if (userId || tenantId) {
      await this.supabaseService.setContext(userId, tenantId);
    }

    next();
  }
}
