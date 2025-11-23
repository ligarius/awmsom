import { Body, Controller, Get, Post } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Permissions(PermissionResource.LOCATION, PermissionAction.CREATE)
  create(@Body() body: { warehouseId: string; code: string; description?: string }) {
    return this.locationsService.create(body);
  }

  @Get('health')
  health() {
    return { status: 'ok', module: 'locations' };
  }

  @Get()
  @Permissions(PermissionResource.LOCATION, PermissionAction.READ)
  list() {
    return this.locationsService.list();
  }
}
