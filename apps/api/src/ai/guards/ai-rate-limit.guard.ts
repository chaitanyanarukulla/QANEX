import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

@Injectable()
export class AiRateLimitGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Throttle by Tenant ID if authenticated, otherwise fallback to IP
    const request = req as unknown as AuthenticatedRequest;
    return Promise.resolve(request.user?.tenantId || request.ip || 'unknown');
  }
}
