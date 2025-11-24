export type TenantStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

export interface Tenant {
  id: string;
  name: string;
  taxId: string;
  email: string;
  plan: string;
  userLimit?: number;
  operationLimit?: number;
  status: TenantStatus;
  createdAt: string;
}

export interface TenantInput {
  name: string;
  taxId: string;
  email: string;
  plan: string;
  userLimit?: number;
  operationLimit?: number;
}

export interface TenantUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  lastLogin?: string;
  permissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount?: number;
}

export interface Permission {
  key: string;
  description: string;
  category: string;
}
