export interface IAuthUser {
  userId: string;
  email: string;
  roles: string[];
  tenantId: string;
  firstName?: string;
  lastName?: string;
  defaultTenantId?: string;
  // Alias often used in code
  id?: string;
  sub: string;
}
