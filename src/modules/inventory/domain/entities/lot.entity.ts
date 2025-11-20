import { LotState } from '../enums/lot-state.enum';

export class Lot {
  constructor(
    public readonly productId: string,
    public readonly code: string,
    public readonly expirationDate?: Date,
    public readonly state: LotState = LotState.NORMAL,
    public readonly id?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public readonly createdBy?: string,
    public readonly updatedBy?: string,
  ) {}

  block(updatedBy?: string) {
    return new Lot(
      this.productId,
      this.code,
      this.expirationDate,
      LotState.BLOCKED,
      this.id,
      this.createdAt,
      this.updatedAt,
      this.createdBy,
      updatedBy ?? this.updatedBy,
    );
  }
}
