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
import { InboundService } from './inbound.service';
import { CreateInboundReceiptDto } from './dto/create-inbound-receipt.dto';
import { AddInboundReceiptLineDto } from './dto/add-inbound-receipt-line.dto';
import { ConfirmInboundReceiptDto } from './dto/confirm-inbound-receipt.dto';
import { GetInboundReceiptsFilterDto } from './dto/get-inbound-receipts-filter.dto';
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
}
