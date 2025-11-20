import { Decimal } from '@prisma/client/runtime/library';
import { PutawayMovement } from '../../src/modules/inbound/domain/entities/putaway-movement.entity';
import { PrismaPutawayMovementRepository } from '../../src/modules/inbound/infrastructure/persistence/prisma/prisma-putaway-movement.repository';

const prismaMock = {
  movementHeader: {
    create: jest.fn(),
  },
};

describe('PrismaPutawayMovementRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda y retorna datos de lote y caducidad en movement lines', async () => {
    const repo = new PrismaPutawayMovementRepository(prismaMock as any);

    const expiryDate = new Date('2025-01-01');
    const createdAt = new Date('2024-06-01T10:00:00Z');
    const updatedAt = new Date('2024-06-01T10:10:00Z');

    prismaMock.movementHeader.create.mockResolvedValue({
      id: 'move-1',
      reference: 'PUTAWAY',
      lines: [
        {
          id: 'line-1',
          movementId: 'move-1',
          productId: 'prod-1',
          batchCode: 'B-123',
          expiryDate,
          fromLocationId: null,
          toLocationId: 'loc-2',
          quantity: new Decimal(2),
          uom: 'PCS',
          createdAt,
          updatedAt,
          createdBy: 'tester',
          updatedBy: 'tester',
        },
      ],
    });

    const movement = new PutawayMovement('prod-1', 2, 'PCS', 'loc-2', undefined, 'B-123', expiryDate, undefined, undefined, undefined, 'tester', 'tester');

    const result = await repo.create(movement);

    expect(prismaMock.movementHeader.create).toHaveBeenCalledWith({
      data: {
        reference: 'PUTAWAY',
        createdBy: 'tester',
        updatedBy: 'tester',
        lines: {
          create: {
            productId: 'prod-1',
            batchCode: 'B-123',
            expiryDate,
            fromLocationId: undefined,
            toLocationId: 'loc-2',
            quantity: new Decimal(2),
            uom: 'PCS',
            createdBy: 'tester',
            updatedBy: 'tester',
          },
        },
      },
      include: { lines: true },
    });

    expect(result.batchCode).toBe('B-123');
    expect(result.expiryDate).toEqual(expiryDate);
    expect(result.toLocationId).toBe('loc-2');
    expect(result.createdAt).toEqual(createdAt);
    expect(result.updatedAt).toEqual(updatedAt);
  });
});
