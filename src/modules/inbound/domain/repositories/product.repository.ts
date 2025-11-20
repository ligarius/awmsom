export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';

export interface ProductRepository {
  findById(id: string): Promise<{
    id: string;
    requiresBatch: boolean;
    requiresExpiryDate: boolean;
    defaultUom: string;
  } | null>;
}
