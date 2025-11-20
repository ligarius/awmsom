import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
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
  createCycleCount(@Body() dto: CreateCycleCountTaskDto) {
    return this.inventoryService.createCycleCountTask(dto);
  }

  @Post('cycle-counts/:id/lines')
  addCycleCountLines(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AddCycleCountLinesDto) {
    return this.inventoryService.addCycleCountLines(id, dto);
  }

  @Post('cycle-counts/:id/start')
  startCycleCount(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.startCycleCount(id);
  }

  @Post('cycle-counts/:id/submit')
  submitCycleCount(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitCycleCountResultDto,
  ) {
    return this.inventoryService.submitCycleCount(id, dto);
  }

  @Get('cycle-counts')
  listCycleCounts(@Query() query: CycleCountQueryDto) {
    return this.inventoryService.listCycleCounts(query);
  }

  @Get('cycle-counts/:id')
  getCycleCount(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.getCycleCountById(id);
  }

  @Post('adjustments')
  createAdjustment(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.inventoryService.createInventoryAdjustment(dto);
  }

  @Get('adjustments')
  listAdjustments(@Query() query: InventoryAdjustmentQueryDto) {
    return this.inventoryService.listInventoryAdjustments(query);
  }

  @Get('adjustments/:id')
  getAdjustment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.getInventoryAdjustmentById(id);
  }
}
