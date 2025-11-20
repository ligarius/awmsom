import { Lot } from '../../../src/modules/inventory/domain/entities/lot.entity';
import { StockItem } from '../../../src/modules/inventory/domain/entities/stock-item.entity';
import { InventoryMovement } from '../../../src/modules/inventory/domain/entities/inventory-movement.entity';
import { LotState } from '../../../src/modules/inventory/domain/enums/lot-state.enum';
import { StockState } from '../../../src/modules/inventory/domain/enums/stock-state.enum';

export const fixtures = {
  lotNormal: new Lot('prod-1', 'LOT-1', new Date('2025-01-01'), LotState.NORMAL, 'lot-1'),
  lotBlocked: new Lot('prod-1', 'LOT-2', new Date('2024-06-01'), LotState.BLOCKED, 'lot-2'),
  availableStock: new StockItem(
    'prod-1',
    5,
    'PCS',
    'loc-1',
    'LOT-1',
    new Date('2025-01-01'),
    StockState.AVAILABLE,
    'stock-1',
  ),
  fresherStock: new StockItem(
    'prod-1',
    10,
    'PCS',
    'loc-2',
    'LOT-2',
    new Date('2024-06-01'),
    StockState.AVAILABLE,
    'stock-2',
  ),
  movement: new InventoryMovement('prod-1', 1, 'PCS', 'loc-1', 'loc-2', 'LOT-1', new Date(), 'tester', 'putaway'),
};
