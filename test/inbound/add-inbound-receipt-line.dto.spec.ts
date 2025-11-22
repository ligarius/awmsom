import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddInboundReceiptLineDto } from '../../src/modules/inbound/dto/add-inbound-receipt-line.dto';

describe('AddInboundReceiptLineDto validation', () => {
  it('rejects zero or negative expectedQty values', async () => {
    const dto = plainToInstance(AddInboundReceiptLineDto, {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      expectedQty: 0,
      uom: 'EA',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'expectedQty')).toBe(true);
  });

  it('accepts positive expectedQty values', async () => {
    const dto = plainToInstance(AddInboundReceiptLineDto, {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      expectedQty: 0.5,
      uom: 'EA',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});
