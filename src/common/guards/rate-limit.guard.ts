import {
  Injectable,
  HttpException,
  HttpStatus,
  ExecutionContext,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const retryAfter = await Promise.resolve(throttlerLimitDetail.timeToExpire);

    throw new HttpException(
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Rate limit excedido',
        message: `Has excedido el número máximo de peticiones permitidas. Intenta nuevamente en ${retryAfter} segundos.`,
        details: {
          path: request.url,
          retryAfter: `${retryAfter} seconds`,
          limit: throttlerLimitDetail.limit,
          contactSupport: 'Si necesitas un límite mayor, contacta a soporte',
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
