import { Body, Controller, Get, Post } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  create(@Body() body: { warehouseId: string; code: string; description?: string }) {
    return this.locationsService.create(body);
  }

  @Get('health')
  health() {
    return { status: 'ok', module: 'locations' };
  }

  @Get()
  list() {
    return this.locationsService.list();
  }
}
