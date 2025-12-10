import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AiRateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Throttle by Tenant ID if authenticated, otherwise fallback to IP
    return (req.user as any)?.tenantId || req.ip;
  }
}
