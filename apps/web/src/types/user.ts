export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    defaultTenantId: string;
}

export interface TenantUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    joinedAt: string;
}
