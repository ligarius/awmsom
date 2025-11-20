import { Lot } from '../entities/lot.entity';

export const LOT_REPOSITORY = Symbol('LOT_REPOSITORY');

export interface LotRepository {
  findByProductAndCode(productId: string, code: string): Promise<Lot | null>;
  save(lot: Lot): Promise<Lot>;
}
