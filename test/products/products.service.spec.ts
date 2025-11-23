import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../../src/modules/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('ProductsService', () => {
  let prisma: any;
  let service: ProductsService;
  let tenantContext: { getTenantId: jest.Mock };

  beforeEach(() => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as PrismaService;

    tenantContext = { getTenantId: jest.fn().mockReturnValue('tenant-1') } as any;

    service = new ProductsService(prisma, tenantContext as any);
  });

  it('creates a product with unique code', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (prisma.product.create as jest.Mock).mockResolvedValue({
      id: 'prod-1',
      sku: 'P-001',
      name: 'Product 1',
      requiresBatch: false,
      requiresExpiryDate: false,
      defaultUom: 'EA',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    });

    const result = await service.create({ code: 'P-001', name: 'Product 1', defaultUom: 'EA' });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: 'tenant-1', sku: 'P-001' }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'prod-1',
        code: 'P-001',
        name: 'Product 1',
      }),
    );
  });

  it('throws conflict when creating duplicate code', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(service.create({ code: 'P-001', name: 'Product 1', defaultUom: 'EA' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('lists products for tenant', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: 'prod-1', sku: 'P-001', name: 'Product 1', requiresBatch: false, requiresExpiryDate: false, defaultUom: 'EA', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const products = await service.findAll();

    expect(prisma.product.findMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' } });
    expect(products[0]).toEqual(expect.objectContaining({ code: 'P-001', name: 'Product 1' }));
  });

  it('throws not found when product is missing', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws conflict when updating to duplicate code', async () => {
    (prisma.product.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 'prod-1', sku: 'OLD', name: 'Product 1', requiresBatch: false, requiresExpiryDate: false, defaultUom: 'EA', isActive: true })
      .mockResolvedValueOnce({ id: 'other' });

    await expect(service.update('prod-1', { code: 'P-001' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('deletes a product when present', async () => {
    const product = {
      id: 'prod-1',
      sku: 'P-001',
      name: 'Product 1',
      requiresBatch: false,
      requiresExpiryDate: false,
      defaultUom: 'EA',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(product);
    (prisma.product.delete as jest.Mock).mockResolvedValue(product);

    const deleted = await service.remove('prod-1');

    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    expect(deleted).toEqual(expect.objectContaining({ code: 'P-001' }));
  });

  it('throws not found when deleting missing product', async () => {
    (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
