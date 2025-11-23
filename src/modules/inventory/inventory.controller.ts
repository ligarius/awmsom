import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { Permissions } from '../../decorators/permissions.decorator';
import {
  AddCycleCountLinesDto,
  CreateCycleCountTaskDto,
  CycleCountQueryDto,
  SubmitCycleCountResultDto,
} from './dto/cycle-count.dto';
import { CreateInventoryAdjustmentDto, InventoryAdjustmentQueryDto } from './dto/inventory-adjustment.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('health')
  health() {
    return this.inventoryService.health();
  }

  @Post('cycle-counts')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.CREATE)
  createCycleCount(@Body() dto: CreateCycleCountTaskDto) {
    return this.inventoryService.createCycleCountTask(dto);
  }

  @Post('cycle-counts/:id/lines')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.UPDATE)
  addCycleCountLines(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AddCycleCountLinesDto) {
    return this.inventoryService.addCycleCountLines(id, dto);
  }

  @Post('cycle-counts/:id/start')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.UPDATE)
  startCycleCount(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.startCycleCount(id);
  }

  @Post('cycle-counts/:id/submit')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.APPROVE)
  submitCycleCount(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitCycleCountResultDto,
  ) {
    return this.inventoryService.submitCycleCount(id, dto);
  }

  @Get('cycle-counts')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.READ)
  listCycleCounts(@Query() query: CycleCountQueryDto) {
    return this.inventoryService.listCycleCounts(query);
  }

  @Get('cycle-counts/:id')
  @Permissions(PermissionResource.CYCLE_COUNT, PermissionAction.READ)
  getCycleCount(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.getCycleCountById(id);
  }

  @Post('adjustments')
  @Permissions(PermissionResource.ADJUSTMENT, PermissionAction.CREATE)
  createAdjustment(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.inventoryService.createInventoryAdjustment(dto);
  }

  @Get('adjustments')
  @Permissions(PermissionResource.ADJUSTMENT, PermissionAction.READ)
  listAdjustments(@Query() query: InventoryAdjustmentQueryDto) {
    return this.inventoryService.listInventoryAdjustments(query);
  }

  @Get('adjustments/:id')
  @Permissions(PermissionResource.ADJUSTMENT, PermissionAction.READ)
  getAdjustment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.getInventoryAdjustmentById(id);
  }
}
