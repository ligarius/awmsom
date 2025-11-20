import { Injectable } from '@nestjs/common';

@Injectable()
export class InventoryService {
  health() {
    return { status: 'ok', module: 'inventory' };
  }
}
