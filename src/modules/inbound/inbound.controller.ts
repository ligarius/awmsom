import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { InboundService } from './inbound.service';
import { CreateInboundReceiptDto } from './dto/create-inbound-receipt.dto';
import { AddInboundReceiptLineDto } from './dto/add-inbound-receipt-line.dto';
import { ConfirmInboundReceiptDto } from './dto/confirm-inbound-receipt.dto';
import { GetInboundReceiptsFilterDto } from './dto/get-inbound-receipts-filter.dto';

@Controller('inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @Post('receipts')
  createReceipt(@Body() dto: CreateInboundReceiptDto) {
    return this.inboundService.createReceipt(dto);
  }

  @Post('receipts/:id/lines')
  addLine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddInboundReceiptLineDto,
  ) {
    return this.inboundService.addLine(id, dto);
  }

  @Get('receipts')
  listReceipts(@Query() filters: GetInboundReceiptsFilterDto) {
    return this.inboundService.listReceipts(filters);
  }

  @Get('receipts/:id')
  getReceipt(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inboundService.getReceipt(id);
  }

  @Post('receipts/:id/confirm')
  confirmReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmInboundReceiptDto,
  ) {
    return this.inboundService.confirmReceipt(id, dto);
  }
}
