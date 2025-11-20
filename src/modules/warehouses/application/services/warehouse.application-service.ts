import { Inject, Injectable } from '@nestjs/common';
import { Warehouse } from '../../domain/entities/warehouse.entity';
import { WarehouseRepository } from '../../domain/repositories/warehouse.repository';
import {
  WarehouseCodeAlreadyExistsError,
  WarehouseNotFoundError,
} from '../exceptions/warehouse.exceptions';
import {
  CreateWarehouseCommand,
  UpdateWarehouseCommand,
  WarehouseQuery,
} from '../dto/warehouse-commands.dto';

@Injectable()
export class WarehouseApplicationService {
  constructor(
    @Inject('WarehouseRepository')
    private readonly repository: WarehouseRepository,
  ) {}

  async createWarehouse(command: CreateWarehouseCommand): Promise<Warehouse> {
    const existing = await this.repository.findByCode(command.code);
    if (existing) {
      throw new WarehouseCodeAlreadyExistsError();
    }

    return this.repository.create(command);
  }

  async getWarehouse(id: string): Promise<Warehouse> {
    const warehouse = await this.repository.findById(id);
    if (!warehouse) {
      throw new WarehouseNotFoundError();
    }

    return warehouse;
  }

  async listWarehouses(query: WarehouseQuery): Promise<{ data: Warehouse[]; total: number }> {
    return this.repository.list(query);
  }

  async updateWarehouse(id: string, command: UpdateWarehouseCommand): Promise<Warehouse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new WarehouseNotFoundError();
    }

    if (command.name === undefined && command.isActive === undefined) {
      return existing;
    }

    return this.repository.update(id, command);
  }

  async deleteWarehouse(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new WarehouseNotFoundError();
    }

    await this.repository.delete(id);
  }
}
