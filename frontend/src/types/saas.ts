export type TenantStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

export interface Tenant {
  id: string;
  name: string;
  taxId?: string;
  email: string;
  plan: string;
  userLimit?: number;
  operationLimit?: number;
  status: TenantStatus;
  createdAt: string;
}

export interface TenantInput {
  name: string;
  taxId?: string;
  email: string;
  plan: string;
  userLimit?: number;
  operationLimit?: number;
  adminName?: string;
  adminPassword?: string;
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

export interface SaasOverview {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    plans: { code: string; count: number }[];
  };
  usage: {
    users: number;
    warehouses: number;
    apiKeys: number;
    integrations: number;
    monthlyOrders: number;
    monthlyShipments: number;
  };
  alerts: {
    totalActive: number;
    evaluatedAt: string;
    active: {
      id: string;
      slo: string;
      severity: "critical" | "warning";
      condition: string;
      action: string;
      service: string;
    }[];
  };
  errors: {
    total: number;
    recent: { service: string; level: string; message: string; timestamp: string }[];
  };
  generatedAt: string;
}
