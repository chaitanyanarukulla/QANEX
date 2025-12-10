/**
 * Global type augmentation for Express Request
 * This extends the Express Request interface to include our custom user property
 */
declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      email: string;
      tenantId: string;
      roles?: string[];
    };
  }
}
