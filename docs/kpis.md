# KPI Reporting

The KPI summary endpoint now exposes capacity and productivity indicators to complement service and inventory metrics.

## Filters
- **Date window**: `fromDate`, `toDate` (mandatory)
- **Scope**: `warehouseId`, `customerId`, `productId`, `zone`
- **Labor filters**: `operatorId`, `shiftStart`, `shiftEnd` (HH:MM)

## Metrics
- **Service**: fill rate, OTIF, total orders shipped.
- **Inventory**: inventory turnover, average inventory on hand, days of supply.
- **Picking productivity**: lines per hour, units per hour, picking accuracy.
- **Capacity**
  - *Space*: utilization (occupied locations vs. active locations), occupied locations, total locations.
  - *Labor*: utilization (picking hours vs. available shift hours), capacity hours (shift length × operators), actual picking hours.
- **Productivity**
  - *Workload by operator*: tasks, lines, units, and hours per picker within the shift window.
  - *Throughput by warehouse*: shipments, outbound orders, lines, and shipped units grouped by warehouse.

Use combinations of `warehouseId`, `zone`, and `operatorId` to segment utilization for specific areas or teams. Shifts are optional; without them an 8-hour window is assumed when computing labor capacity.
