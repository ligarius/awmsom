import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ProductRepository } from '../../domain/repositories/product.repository';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) return null;

    return {
      id: product.id,
      requiresBatch: product.requiresBatch,
      requiresExpiryDate: product.requiresExpiryDate,
      defaultUom: product.defaultUom,
    };
  }
}
