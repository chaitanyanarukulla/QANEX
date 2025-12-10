import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from './tenants.service';

// Extend Request interface to include tenantId
declare module 'express' {
  interface Request {
    tenantId?: string;
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantsService: TenantsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 1. Check Header
    const tenantIdHeader = req.headers['x-tenant-id'];
    if (tenantIdHeader && typeof tenantIdHeader === 'string') {
      req.tenantId = tenantIdHeader;
      return next();
    }

    // 2. Check Subdomain (e.g., acme.tracegate.app)
    const host = req.headers.host; // e.g., "acme.localhost:3000" or "acme.tracegate.app"
    if (host) {
      const parts = host.split('.');
      // Logic regarding localhost vs production domains
      // Assuming 3 parts for subdomain.domain.co or similar
      // For localhost:3000, there is no subdomain unless configured like acme.localhost
      // Let's assume simplest: first part is subdomain if not 'www' and not 'localhost' (unless subdomained)

      // Getting the slug from the FIRST part of the host
      // If host is specifically just domain.com, this logic needs care.
      // For now, implementing a basic check.

      if (
        parts.length > 1 &&
        parts[0] !== 'www' &&
        parts[0] !== 'localhost' &&
        !host.startsWith('127.0.0.1')
      ) {
        const slug = parts[0];
        const tenant = await this.tenantsService.findBySlug(slug);
        if (tenant) {
          req.tenantId = tenant.id;
          return next();
        }
      }
    }

    // 3. Fallback / No Tenant Found
    // Depending on requirements, we might allow no tenant (public pages) or throw.
    // For API, usually we want a tenant context if strict.
    // But login/endpoints might not need it.
    // We will leave req.tenantId undefined if not found.

    next();
  }
}
