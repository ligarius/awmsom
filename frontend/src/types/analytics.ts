export interface ExecutiveKpis {
  otif: number;
  fillRate: number;
  serviceLevel: number;
  inventoryUnits: number;
  inventoryValue: number;
  abc: { a: number; b: number; c: number };
  rotationBySku: { sku: string; turns: number }[];
  demandByDay: { date: string; units: number }[];
  heatmap: { hour: number; value: number }[];
  topConsumption: { sku: string; units: number }[];
  topCritical: { sku: string; stock: number }[];
}

export interface OperationsKpis {
  inboundToday: number;
  releasedOrders: number;
  pickingOrders: number;
  completedOrders: number;
  activeWaves: number;
  replenishmentsPending: number;
  pickingPerformance: { hour: string; lines: number }[];
  movementsByType: { type: string; count: number }[];
}

export interface InventoryKpis {
  activeSkus: number;
  totalStock: number;
  availableStock: number;
  committedStock: number;
  damagedStock: number;
  zones: { label: string; utilization: number }[];
  abcRotation: { sku: string; category: "A" | "B" | "C"; turns: number }[];
  topLocations: { location: string; occupancy: number }[];
}

export interface PerformanceKpis {
  productivity: { user: string; linesPerHour: number; tasksPerHour: number }[];
  times: { pick: number; handover: number; packing: number };
  errors: { type: string; count: number }[];
}

export interface TraceabilityProductResponse {
  sku: string;
  movements: MovementTrace[];
  locations: { location: string; quantity: number; batch?: string }[];
  batches: string[];
  inbound: { document: string; date: string }[];
  outbound: { document: string; date: string }[];
}

export interface TraceabilityBatchResponse {
  batch: string;
  reception: { document: string; date: string; supplier?: string };
  movements: MovementTrace[];
  orders: { id: string; customer: string; date: string }[];
  customers: string[];
}

export interface TraceabilityCustomerResponse {
  customer: string;
  orders: { id: string; date: string; status: string }[];
  products: { sku: string; units: number; batches: string[] }[];
  otif: number;
}

export interface TraceabilityOrderResponse {
  orderId: string;
  status: string;
  customer: string;
  lines: { sku: string; batch?: string; qty: number }[];
  movements: MovementTrace[];
  pickingTasks: { id: string; user: string; status: string }[];
  packing: { user: string; timestamp: string } | null;
  shipments: { id: string; carrier: string; timestamp: string }[];
}

export interface TraceabilityMovementResponse {
  movementId: string;
  user: string;
  from: string;
  to: string;
  sku: string;
  batch?: string;
  quantity: number;
  timestamp: string;
  impact: string;
}

export interface MovementTrace {
  id: string;
  from: string;
  to: string;
  user: string;
  sku: string;
  batch?: string;
  quantity: number;
  timestamp: string;
  impact: string;
}

export interface ReportRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  warehouse?: string;
  customer?: string;
  type?: string;
  amount?: number;
}
