import { Injectable } from '@nestjs/common';

@Injectable()
export class WarehousesService {
  health() {
    return { status: 'ok', module: 'warehouses' };
  }
}
