import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentTenant() Decorator
 *
 * Extracts the tenant ID from the request context (set by TenantMiddleware).
 * Eliminates boilerplate: const tenantId = req.user?.tenantId || 'mock-tenant-id'
 *
 * Usage in Controllers:
 * @Get()
 * findAll(@CurrentTenant() tenantId: string): Promise<Item[]> {
 *   return this.itemService.findAll(tenantId);
 * }
 */

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request: any = ctx.switchToHttp().getRequest();
    // First try from JWT payload (req.user.tenantId)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (request?.user?.tenantId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return request.user.tenantId;
    }
    // Fall back to tenantId set by TenantMiddleware
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (request?.tenantId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      return request.tenantId;
    }
    // Last resort fallback for development/testing
    return 'mock-tenant-id';
  },
);
