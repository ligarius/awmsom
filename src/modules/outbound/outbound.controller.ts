import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { OutboundService } from './outbound.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { ReleaseOutboundOrderDto } from './dto/release-outbound-order.dto';
import { CreatePickingTaskDto } from './dto/create-picking-task.dto';
import { ConfirmPickingDto } from './dto/confirm-picking.dto';
import { GetOutboundOrdersFilterDto } from './dto/get-outbound-orders-filter.dto';
import { GetPickingTasksFilterDto } from './dto/get-picking-tasks-filter.dto';
import { CreateHandlingUnitDto } from './dto/create-handling-unit.dto';
import { AddItemsToHandlingUnitDto } from './dto/add-items-to-handling-unit.dto';
import { GetHandlingUnitsFilterDto } from './dto/get-handling-units-filter.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AssignHandlingUnitsToShipmentDto } from './dto/assign-handling-units-to-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { GetShipmentsFilterDto } from './dto/get-shipments-filter.dto';
import { Permissions } from '../../decorators/permissions.decorator';

@Controller('outbound')
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  @Post('orders')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.CREATE)
  createOrder(@Body() dto: CreateOutboundOrderDto) {
    return this.outboundService.createOutboundOrder(dto);
  }

  @Get('orders')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.READ)
  listOrders(@Query() filters: GetOutboundOrdersFilterDto) {
    return this.outboundService.listOutboundOrders(filters);
  }

  @Get('orders/:id')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.READ)
  getOrder(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.getOutboundOrder(id);
  }

  @Post('orders/:id/release')
  @Permissions(PermissionResource.OUTBOUND, PermissionAction.APPROVE)
  releaseOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _dto: ReleaseOutboundOrderDto,
  ) {
    return this.outboundService.releaseOutboundOrder(id);
  }

  @Post('orders/:id/create-picking-task')
  @Permissions(PermissionResource.PICKING, PermissionAction.CREATE)
  createPickingTask(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreatePickingTaskDto,
  ) {
    return this.outboundService.createPickingTask(id, dto);
  }

  @Post('picking-tasks/:id/start')
  @Permissions(PermissionResource.PICKING, PermissionAction.UPDATE)
  startPicking(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.startPickingTask(id);
  }

  @Post('picking-tasks/:id/confirm')
  @Permissions(PermissionResource.PICKING, PermissionAction.APPROVE)
  confirmPicking(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmPickingDto,
  ) {
    return this.outboundService.confirmPickingTask(id, dto);
  }

  @Get('picking-tasks')
  @Permissions(PermissionResource.PICKING, PermissionAction.READ)
  listPickingTasks(@Query() filters: GetPickingTasksFilterDto) {
    return this.outboundService.listPickingTasks(filters);
  }

  @Get('picking-tasks/:id')
  @Permissions(PermissionResource.PICKING, PermissionAction.READ)
  getPickingTask(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.getPickingTask(id);
  }

  @Post('handling-units')
  @Permissions(PermissionResource.PACKING, PermissionAction.CREATE)
  createHandlingUnit(@Body() dto: CreateHandlingUnitDto) {
    return this.outboundService.createHandlingUnit(dto);
  }

  @Post('handling-units/:id/items')
  @Permissions(PermissionResource.PACKING, PermissionAction.UPDATE)
  addItemsToHandlingUnit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddItemsToHandlingUnitDto,
  ) {
    return this.outboundService.addItemsToHandlingUnit(id, dto);
  }

  @Get('handling-units')
  @Permissions(PermissionResource.PACKING, PermissionAction.READ)
  listHandlingUnits(@Query() filters: GetHandlingUnitsFilterDto) {
    return this.outboundService.listHandlingUnits(filters);
  }

  @Get('handling-units/:id')
  @Permissions(PermissionResource.PACKING, PermissionAction.READ)
  getHandlingUnit(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.getHandlingUnit(id);
  }

  @Post('shipments')
  @Permissions(PermissionResource.SHIPMENT, PermissionAction.CREATE)
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.outboundService.createShipment(dto);
  }

  @Post('shipments/:id/handling-units')
  @Permissions(PermissionResource.SHIPMENT, PermissionAction.UPDATE)
  assignHandlingUnits(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignHandlingUnitsToShipmentDto,
  ) {
    return this.outboundService.assignHandlingUnitsToShipment(id, dto);
  }

  @Post('shipments/:id/dispatch')
  @Permissions(PermissionResource.SHIPMENT, PermissionAction.APPROVE)
  dispatchShipment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DispatchShipmentDto,
  ) {
    return this.outboundService.dispatchShipment(id, dto);
  }

  @Get('shipments')
  @Permissions(PermissionResource.SHIPMENT, PermissionAction.READ)
  listShipments(@Query() filters: GetShipmentsFilterDto) {
    return this.outboundService.listShipments(filters);
  }

  @Get('shipments/:id')
  @Permissions(PermissionResource.SHIPMENT, PermissionAction.READ)
  getShipment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.outboundService.getShipment(id);
  }
}
