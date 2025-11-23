import { Warehouse } from '../entities/warehouse.entity';

export interface WarehouseRepository {
  create(data: {
    code: string;
    name: string;
    isActive?: boolean;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<Warehouse>;
  findById(id: string): Promise<Warehouse | null>;
  findByCode(code: string): Promise<Warehouse | null>;
  update(
    id: string,
    data: { code?: string; name?: string; isActive?: boolean; updatedBy?: string },
  ): Promise<Warehouse>;
  list(params: {
    page: number;
    limit: number;
    code?: string;
    name?: string;
    isActive?: boolean;
  }): Promise<{ data: Warehouse[]; total: number }>;
  delete(id: string): Promise<void>;
}
