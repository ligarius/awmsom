import { Warehouse } from '../../../domain/entities/warehouse.entity';

export class WarehouseHttpMapper {
  static toResponse(warehouse: Warehouse) {
    return {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      isActive: warehouse.isActive,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
      createdBy: warehouse.createdBy,
      updatedBy: warehouse.updatedBy,
    };
  }
}
