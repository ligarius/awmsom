import { Warehouse } from '../entities/warehouse.entity';

export interface WarehouseRepository {
  create(data: { code: string; name: string; isActive?: boolean }): Promise<Warehouse>;
  findById(id: string): Promise<Warehouse | null>;
  findByCode(code: string): Promise<Warehouse | null>;
  update(id: string, data: { name?: string; isActive?: boolean }): Promise<Warehouse>;
  list(params: {
    page: number;
    limit: number;
    code?: string;
    name?: string;
    isActive?: boolean;
  }): Promise<{ data: Warehouse[]; total: number }>;
  delete(id: string): Promise<void>;
}
