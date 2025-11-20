import { BlockLotUseCase } from '../../src/modules/inventory/application/use-cases/block-lot.use-case';
import { Lot } from '../../src/modules/inventory/domain/entities/lot.entity';
import { LotRepository } from '../../src/modules/inventory/domain/repositories/lot.repository';
import { fixtures } from './fixtures/inventory.fixtures';

describe('Given a normal lot when blocking', () => {
  const lotRepo: LotRepository = {
    findByProductAndCode: jest.fn(async () => fixtures.lotNormal),
    save: jest.fn(async (lot) => lot),
  };

  it('then it updates the lot state to BLOCKED', async () => {
    const useCase = new BlockLotUseCase(lotRepo);

    const result = await useCase.execute({ productId: 'prod-1', lotCode: 'LOT-1', updatedBy: 'qa-user' });

    expect(result).toBeInstanceOf(Lot);
    expect(result.state).toBe('BLOCKED');
    expect(lotRepo.save).toHaveBeenCalled();
  });
});
