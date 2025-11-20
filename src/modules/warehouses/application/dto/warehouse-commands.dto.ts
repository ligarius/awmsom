export interface CreateWarehouseCommand {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateWarehouseCommand {
  name?: string;
  isActive?: boolean;
}

export interface WarehouseQuery {
  page: number;
  limit: number;
  code?: string;
  name?: string;
  isActive?: boolean;
}
