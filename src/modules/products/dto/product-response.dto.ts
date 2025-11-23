export class ProductResponseDto {
  id: string;
  code: string;
  name: string;
  requiresBatch: boolean;
  requiresExpiryDate: boolean;
  defaultUom: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
