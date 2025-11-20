import { Inject, Injectable } from '@nestjs/common';
import { LOT_REPOSITORY, LotRepository } from '../../domain/repositories/lot.repository';
import { Lot } from '../../domain/entities/lot.entity';
import { LotState } from '../../domain/enums/lot-state.enum';

@Injectable()
export class BlockLotUseCase {
  constructor(
    @Inject(LOT_REPOSITORY)
    private readonly lotRepo: LotRepository,
  ) {}

  async execute(input: { productId: string; lotCode: string; updatedBy?: string }): Promise<Lot> {
    const lot = await this.lotRepo.findByProductAndCode(input.productId, input.lotCode);

    if (!lot) {
      throw new Error('Lote no encontrado');
    }

    if (lot.state === LotState.BLOCKED) {
      return lot;
    }

    const blocked = lot.block(input.updatedBy);
    return this.lotRepo.save(blocked);
  }
}
