import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { WarehouseApplicationService } from './application/services/warehouse.application-service';
import {
  WarehouseCodeAlreadyExistsError,
  WarehouseNotFoundError,
} from './application/exceptions/warehouse.exceptions';
import { CreateWarehouseDto } from './infrastructure/http/dto/create-warehouse.dto';
import { QueryWarehousesDto } from './infrastructure/http/dto/query-warehouses.dto';
import { UpdateWarehouseDto } from './infrastructure/http/dto/update-warehouse.dto';
import { WarehouseHttpMapper } from './infrastructure/http/mappers/warehouse.mapper';
import { TenantContextService } from '../../common/tenant-context.service';
import { Permissions } from '../../decorators/permissions.decorator';

@Controller('warehouses')
export class WarehousesController {
  constructor(
    private readonly warehouseApp: WarehouseApplicationService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post()
  @Permissions(PermissionResource.WAREHOUSE, PermissionAction.CREATE)
  async create(@Body() dto: CreateWarehouseDto) {
    try {
      const warehouse = await this.warehouseApp.createWarehouse({
        ...dto,
        tenantId: this.tenantContext.getTenantId(),
      });
      return WarehouseHttpMapper.toResponse(warehouse);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  @Get()
  @Permissions(PermissionResource.WAREHOUSE, PermissionAction.READ)
  async list(@Query() query: QueryWarehousesDto) {
    try {
      const { data, total } = await this.warehouseApp.listWarehouses(query);
      return {
        data: data.map(WarehouseHttpMapper.toResponse),
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
        },
      };
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  @Get(':id')
  @Permissions(PermissionResource.WAREHOUSE, PermissionAction.READ)
  async findOne(@Param('id') id: string) {
    try {
      const warehouse = await this.warehouseApp.getWarehouse(id);
      return WarehouseHttpMapper.toResponse(warehouse);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  @Put(':id')
  @Permissions(PermissionResource.WAREHOUSE, PermissionAction.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    try {
      const warehouse = await this.warehouseApp.updateWarehouse(id, dto);
      return WarehouseHttpMapper.toResponse(warehouse);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  @Delete(':id')
  @Permissions(PermissionResource.WAREHOUSE, PermissionAction.DELETE)
  async delete(@Param('id') id: string) {
    try {
      await this.warehouseApp.deleteWarehouse(id);
      return { message: 'Warehouse deactivated' };
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleError(error: Error): never {
    if (error instanceof WarehouseNotFoundError) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }

    if (error instanceof WarehouseCodeAlreadyExistsError) {
      throw new HttpException(error.message, HttpStatus.CONFLICT);
    }

    throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
