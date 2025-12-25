import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Permissions(PermissionResource.LOCATION, PermissionAction.CREATE)
  create(@Body() body: { warehouseId: string; code: string; description?: string; zone?: string }) {
    return this.locationsService.create(body);
  }

  @Get('health')
  health() {
    return { status: 'ok', module: 'locations' };
  }

  @Get('suggestions')
  @Permissions(PermissionResource.LOCATION, PermissionAction.READ)
  suggest(@Query('warehouseId') warehouseId: string) {
    return this.locationsService.suggest(warehouseId);
  }

  @Get()
  @Permissions(PermissionResource.LOCATION, PermissionAction.READ)
  list() {
    return this.locationsService.list();
  }

  @Get(':id')
  @Permissions(PermissionResource.LOCATION, PermissionAction.READ)
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Put(':id')
  @Permissions(PermissionResource.LOCATION, PermissionAction.UPDATE)
  update(
    @Param('id') id: string,
    @Body() body: { warehouseId?: string; code?: string; description?: string; zone?: string },
  ) {
    return this.locationsService.update(id, body);
  }

  @Delete(':id')
  @Permissions(PermissionResource.LOCATION, PermissionAction.DELETE)
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
