export interface CreateWarehouseCommand {
  code: string;
  name: string;
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
}

export interface UpdateWarehouseCommand {
  code?: string;
  name?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface WarehouseQuery {
  page: number;
  limit: number;
  code?: string;
  name?: string;
  isActive?: boolean;
}
