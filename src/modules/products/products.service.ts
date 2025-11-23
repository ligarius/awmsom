import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private toResponse(product: any): ProductResponseDto {
    return {
      id: product.id,
      code: product.sku,
      name: product.name,
      requiresBatch: product.requiresBatch,
      requiresExpiryDate: product.requiresExpiryDate,
      defaultUom: product.defaultUom,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;

    const existing = await prisma.product.findFirst({ where: { tenantId, sku: dto.code } });
    if (existing) {
      throw new ConflictException('Product code already exists');
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        sku: dto.code,
        name: dto.name,
        requiresBatch: dto.requiresBatch ?? false,
        requiresExpiryDate: dto.requiresExpiryDate ?? false,
        defaultUom: dto.defaultUom,
        isActive: dto.isActive ?? true,
      },
    });

    return this.toResponse(product);
  }

  async findAll(): Promise<ProductResponseDto[]> {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;

    const products = await prisma.product.findMany({ where: { tenantId } });
    return products.map((product: any) => this.toResponse(product));
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;

    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.toResponse(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;

    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.code) {
      const duplicate = await prisma.product.findFirst({
        where: { tenantId, sku: dto.code, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('Product code already exists');
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku: dto.code ?? product.sku,
        name: dto.name ?? product.name,
        requiresBatch: dto.requiresBatch ?? product.requiresBatch,
        requiresExpiryDate: dto.requiresExpiryDate ?? product.requiresExpiryDate,
        defaultUom: dto.defaultUom ?? product.defaultUom,
        isActive: dto.isActive ?? product.isActive,
      },
    });

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<ProductResponseDto> {
    const tenantId = this.tenantContext.getTenantId();
    const prisma = this.prisma as any;

    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const deleted = await prisma.product.delete({ where: { id } });
    return this.toResponse(deleted);
  }

  health() {
    return { status: 'ok', module: 'products' };
  }
}
