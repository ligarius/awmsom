import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { InboundService } from './inbound.service';
import { CreateInboundReceiptDto } from './dto/create-inbound-receipt.dto';
import { AddInboundReceiptLineDto } from './dto/add-inbound-receipt-line.dto';
import { ConfirmInboundReceiptDto } from './dto/confirm-inbound-receipt.dto';
import { GetInboundReceiptsFilterDto } from './dto/get-inbound-receipts-filter.dto';
import { CreateInboundLegacyDto } from './dto/create-inbound-legacy.dto';
import { GetInboundLegacyFilterDto } from './dto/get-inbound-legacy-filter.dto';
import { ReceiveInboundLineDto } from './dto/receive-inbound-line.dto';
import { Permissions } from '../../decorators/permissions.decorator';

@Controller('inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @Post('receipts')
  @Permissions(PermissionResource.INBOUND, PermissionAction.CREATE)
  createReceipt(@Body() dto: CreateInboundReceiptDto) {
    return this.inboundService.createReceipt(dto);
  }

  @Post('receipts/:id/lines')
  @Permissions(PermissionResource.INBOUND, PermissionAction.UPDATE)
  addLine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddInboundReceiptLineDto,
  ) {
    return this.inboundService.addLine(id, dto);
  }

  @Get('receipts')
  @Permissions(PermissionResource.INBOUND, PermissionAction.READ)
  listReceipts(@Query() filters: GetInboundReceiptsFilterDto) {
    return this.inboundService.listReceipts(filters);
  }

  @Get('receipts/:id')
  @Permissions(PermissionResource.INBOUND, PermissionAction.READ)
  getReceipt(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inboundService.getReceipt(id);
  }

  @Post('receipts/:id/confirm')
  @Permissions(PermissionResource.INBOUND, PermissionAction.APPROVE)
  confirmReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmInboundReceiptDto,
  ) {
    return this.inboundService.confirmReceipt(id, dto);
  }

  @Get()
  @Permissions(PermissionResource.INBOUND, PermissionAction.READ)
  listLegacy(@Query() filters: GetInboundLegacyFilterDto) {
    return this.inboundService.listLegacyReceipts(filters);
  }

  @Post()
  @Permissions(PermissionResource.INBOUND, PermissionAction.CREATE)
  createLegacy(@Body() dto: CreateInboundLegacyDto) {
    return this.inboundService.createLegacyReceipt(dto);
  }

  @Get(':id')
  @Permissions(PermissionResource.INBOUND, PermissionAction.READ)
  getLegacy(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inboundService.getLegacyReceipt(id);
  }

  @Post(':id/receive-line')
  @Permissions(PermissionResource.INBOUND, PermissionAction.UPDATE)
  receiveLine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReceiveInboundLineDto,
  ) {
    return this.inboundService.receiveLegacyLine(id, dto);
  }

  @Patch(':id/complete')
  @Permissions(PermissionResource.INBOUND, PermissionAction.APPROVE)
  completeLegacy(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inboundService.completeLegacyReceipt(id);
  }
}
