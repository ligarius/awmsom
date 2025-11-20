import { Body, Controller, Post } from '@nestjs/common';
import { CreateInboundReceiptUseCase } from '../application/use-cases/create-inbound-receipt.use-case';
import { RegisterPutawayUseCase } from '../application/use-cases/register-putaway.use-case';
import { CreateInboundReceiptDto } from '../dto/create-inbound-receipt.dto';
import { RegisterPutawayDto } from '../dto/register-putaway.dto';

@Controller('inbound')
export class InboundController {
  constructor(
    private readonly createReceipt: CreateInboundReceiptUseCase,
    private readonly registerPutaway: RegisterPutawayUseCase,
  ) {}

  @Post('receipts')
  async createReceiptEndpoint(@Body() dto: CreateInboundReceiptDto) {
    const receipt = await this.createReceipt.execute({
      reference: dto.reference,
      lines: dto.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        uom: line.uom,
        batchCode: line.batchCode,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
        createdBy: line.createdBy,
        updatedBy: line.updatedBy,
      })),
      createdBy: dto.createdBy,
      updatedBy: dto.updatedBy,
    });
    return receipt;
  }

  @Post('putaway')
  async registerPutawayEndpoint(@Body() dto: RegisterPutawayDto) {
    const movement = await this.registerPutaway.execute({
      productId: dto.productId,
      quantity: dto.quantity,
      uom: dto.uom,
      toLocationId: dto.toLocationId,
      fromLocationId: dto.fromLocationId,
      batchCode: dto.batchCode,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      createdBy: dto.createdBy,
      updatedBy: dto.updatedBy,
    });
    return movement;
  }
}
