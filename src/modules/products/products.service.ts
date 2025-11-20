import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  health() {
    return { status: 'ok', module: 'products' };
  }
}
