import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { OutboundService } from './outbound.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { ReleaseOutboundOrderDto } from './dto/release-outbound-order.dto';
import { CreatePickingTaskDto } from './dto/create-picking-task.dto';
import { ConfirmPickingDto } from './dto/confirm-picking.dto';
import { GetOutboundOrdersFilterDto } from './dto/get-outbound-orders-filter.dto';
import { GetPickingTasksFilterDto } from './dto/get-picking-tasks-filter.dto';

@Controller('outbound')
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post('orders')
  createOrder(@Body() dto: CreateOutboundOrderDto) {
    return this.outboundService.createOutboundOrder(dto);
  }

  @Get('orders')
  listOrders(@Query() filters: GetOutboundOrdersFilterDto) {
    return this.outboundService.listOutboundOrders(filters);
  }

  @Get('orders/:id')
  getOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.getOutboundOrder(id);
  }

  @Post('orders/:id/release')
  releaseOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _dto: ReleaseOutboundOrderDto,
  ) {
    return this.outboundService.releaseOutboundOrder(id);
  }

  @Post('orders/:id/create-picking-task')
  createPickingTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreatePickingTaskDto,
  ) {
    return this.outboundService.createPickingTask(id, dto);
  }

  @Post('picking-tasks/:id/start')
  startPicking(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.startPickingTask(id);
  }

  @Post('picking-tasks/:id/confirm')
  confirmPicking(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmPickingDto,
  ) {
    return this.outboundService.confirmPickingTask(id, dto);
  }

  @Get('picking-tasks')
  listPickingTasks(@Query() filters: GetPickingTasksFilterDto) {
    return this.outboundService.listPickingTasks(filters);
  }

  @Get('picking-tasks/:id')
  getPickingTask(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.getPickingTask(id);
  }
}
