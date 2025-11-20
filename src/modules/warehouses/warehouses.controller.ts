import { Controller, Get } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get('health')
  health() {
    return this.warehousesService.health();
  }
}
