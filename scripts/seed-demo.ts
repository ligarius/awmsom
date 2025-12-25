import { NestFactory } from '@nestjs/core';
import {
  AdjustmentType,
  HandlingUnitType,
  InboundReceiptStatus,
  MovementStatus,
  MovementType,
  OutboundOrderStatus,
  PermissionAction,
  PermissionResource,
  PickingTaskStatus,
  PlanCode,
  Prisma,
  ReplenishmentMethod,
  ReplenishmentStatus,
  ShipmentStatus,
  StockStatus,
  WavePickingStrategy,
  WaveStatus,
  ZoneType,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { OnboardingService } from '../src/modules/onboarding/onboarding.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RbacService } from '../src/modules/rbac/rbac.service';
import { UserAccountService } from '../src/modules/users/user-account.service';
import { ROLE_OWNER, ROLE_PLATFORM_ADMIN } from '../src/common/auth.constants';
import { DEFAULT_MOVEMENT_REASONS } from '../src/modules/config/movement-reasons.constants';

type TenantSeed = {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  planCode: PlanCode;
};

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@awms.local';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'Owner123!';
const OWNER_NAME = process.env.OWNER_NAME ?? 'Owner';
const PLATFORM_TENANT_NAME = process.env.PLATFORM_TENANT_NAME ?? 'AWMS Platform';

const PLAN_DEFS = [
  {
    code: PlanCode.BASIC,
    name: 'Silver',
    description: 'Basico',
    maxWarehouses: 1,
    maxUsers: 15,
    maxApiKeys: 2,
    maxMonthlyOrders: 2000,
    maxMonthlyShipments: 800,
    maxIntegrations: 2,
  },
  {
    code: PlanCode.PRO,
    name: 'Gold',
    description: 'Avanzado',
    maxWarehouses: 3,
    maxUsers: 50,
    maxApiKeys: 5,
    maxMonthlyOrders: 12000,
    maxMonthlyShipments: 6000,
    maxIntegrations: 6,
  },
  {
    code: PlanCode.ENTERPRISE,
    name: 'Diamante',
    description: 'Full',
    maxWarehouses: 10,
    maxUsers: 250,
    maxApiKeys: 20,
    maxMonthlyOrders: 60000,
    maxMonthlyShipments: 30000,
    maxIntegrations: 25,
  },
];

const DEMO_TENANTS: TenantSeed[] = [
  {
    name: 'Andes Retail',
    adminName: 'Admin Andes',
    adminEmail: 'admin@andes.local',
    adminPassword: 'Tenant123!',
    planCode: PlanCode.BASIC,
  },
  {
    name: 'Pacific Logistics',
    adminName: 'Admin Pacific',
    adminEmail: 'admin@pacific.local',
    adminPassword: 'Tenant123!',
    planCode: PlanCode.PRO,
  },
  {
    name: 'Lima Foods',
    adminName: 'Admin Lima',
    adminEmail: 'admin@lima.local',
    adminPassword: 'Tenant123!',
    planCode: PlanCode.ENTERPRISE,
  },
];

const padCode = (value: number, size = 2) => value.toString().padStart(size, '0');
const DEMO_SKU_PREFIX = 'DEMO-';
const DEMO_BATCH_PREFIX = 'BATCH-DEMO-';
const DEMO_MOVE_PREFIX = 'MOVE-DEMO-';
const DEMO_PRODUCT_TARGET = 50;
const DEMO_MOVEMENT_TARGET = 200;
const DEMO_BATCHES_PER_PRODUCT = 2;
const DEMO_MOVEMENT_DAY_SPAN = 60;

const parseCliArg = (args: string[], key: string) => {
  const prefix = `${key}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.substring(prefix.length);
  }
  const index = args.indexOf(key);
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
};

const resolveTenantFilter = () => {
  const args = process.argv.slice(2);
  return (
    parseCliArg(args, '--tenant') ??
    parseCliArg(args, '--tenantId') ??
    parseCliArg(args, '--tenant-id') ??
    parseCliArg(args, '--tenantName') ??
    parseCliArg(args, '--tenant-name')
  );
};

type SeedProduct = {
  id: string;
  sku: string;
  requiresBatch: boolean;
  requiresExpiryDate: boolean;
};

type SeedBatch = {
  id: string;
  batchCode: string;
  expiryDate?: Date | null;
};

const parseDemoSkuIndex = (sku: string) => {
  const match = sku.match(/^DEMO-(\d{1,})$/);
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
};

const buildMovementTimestamp = (index: number) => {
  const date = new Date();
  const daysAgo = index % DEMO_MOVEMENT_DAY_SPAN;
  date.setDate(date.getDate() - daysAgo);
  date.setHours(8 + (index % 9), (index * 7) % 60, 0, 0);
  return date;
};

const DEMO_REASON_BY_TYPE: Record<MovementType, string> = {
  [MovementType.INBOUND_RECEIPT]: 'RECEIPT',
  [MovementType.OUTBOUND_SHIPMENT]: 'SHIPMENT',
  [MovementType.INTERNAL_TRANSFER]: 'RELOCATE',
  [MovementType.ADJUSTMENT]: 'ADJUSTMENT',
};

const normalizeReasonCode = (code: string) => code.trim().toUpperCase();

async function ensureMovementReasons(prisma: PrismaService, tenantId: string) {
  const existing = await prisma.movementReasonConfig.findMany({ where: { tenantId } });
  if (existing.length === 0) {
    await prisma.movementReasonConfig.createMany({
      data: DEFAULT_MOVEMENT_REASONS.map((reason) => ({
        tenantId,
        code: normalizeReasonCode(reason.code),
        label: reason.label,
        description: reason.description ?? null,
        isActive: true,
        isDefault: reason.isDefault ?? false,
      })),
    });
  }

  const reasons = await prisma.movementReasonConfig.findMany({ where: { tenantId } });
  if (!reasons.some((reason) => reason.isDefault) && reasons.length > 0) {
    await prisma.movementReasonConfig.update({
      where: { id: reasons[0].id },
      data: { isDefault: true },
    });
  }

  return new Map(reasons.map((reason) => [reason.code, reason.id]));
}

async function assignDemoMovementReasons(
  prisma: PrismaService,
  tenantId: string,
  reasonMap: Map<string, string>,
) {
  for (const [type, code] of Object.entries(DEMO_REASON_BY_TYPE)) {
    const reasonId = reasonMap.get(code);
    if (!reasonId) {
      continue;
    }
    await prisma.movementHeader.updateMany({
      where: {
        tenantId,
        movementType: type as MovementType,
        reference: { startsWith: DEMO_MOVE_PREFIX },
        reasonId: null,
      },
      data: { reasonId },
    });
  }
}

async function ensureDemoProducts(
  prisma: PrismaService,
  tenantId: string,
  targetCount: number,
): Promise<{ products: SeedProduct[]; created: SeedProduct[] }> {
  const existing = (await prisma.product.findMany({
    where: { tenantId, sku: { startsWith: DEMO_SKU_PREFIX } },
    orderBy: { sku: 'asc' },
  })) as SeedProduct[];

  const indices = existing
    .map((product) => parseDemoSkuIndex(product.sku))
    .filter((value): value is number => value !== null);
  let nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 1;

  const created: SeedProduct[] = [];
  const products = [...existing];

  while (products.length < targetCount) {
    const sku = `${DEMO_SKU_PREFIX}${padCode(nextIndex, 3)}`;
    if (products.some((product) => product.sku === sku)) {
      nextIndex += 1;
      continue;
    }

    const requiresBatch = nextIndex % 4 === 0;
    const requiresExpiryDate = nextIndex % 6 === 0;
    const createdProduct = await prisma.product.create({
      data: {
        tenantId,
        sku,
        name: `Producto Demo ${padCode(nextIndex, 2)}`,
        defaultUom: 'EA',
        requiresBatch,
        requiresExpiryDate,
        isActive: true,
      },
    });
    products.push(createdProduct);
    created.push(createdProduct);
    nextIndex += 1;
  }

  return { products, created };
}

async function ensureDemoBatches(
  prisma: PrismaService,
  tenantId: string,
  products: SeedProduct[],
  targetPerProduct = DEMO_BATCHES_PER_PRODUCT,
) {
  const batchMap = new Map<string, SeedBatch[]>();
  const now = new Date();

  for (const product of products) {
    if (!product.requiresBatch && !product.requiresExpiryDate) {
      continue;
    }

    const prefix = `${DEMO_BATCH_PREFIX}${product.sku}-`;
    const existing = await prisma.batch.findMany({
      where: { tenantId, productId: product.id, code: { startsWith: prefix } },
      orderBy: { code: 'asc' },
    });
    const batches: SeedBatch[] = existing.map((batch) => ({
      id: batch.id,
      batchCode: batch.batchCode,
      expiryDate: batch.expiryDate ?? undefined,
    }));

    for (let index = 1; index <= targetPerProduct; index += 1) {
      const code = `${prefix}${padCode(index, 2)}`;
      if (existing.some((batch) => batch.code === code)) {
        continue;
      }
      const skuIndex = parseDemoSkuIndex(product.sku) ?? 0;
      const baseDays = 25 + index * 30 + (skuIndex % 10);
      const expiryDate =
        product.requiresExpiryDate && skuIndex % 7 === 0 && index === 1
          ? new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
          : product.requiresExpiryDate
          ? new Date(now.getTime() + baseDays * 24 * 60 * 60 * 1000)
          : undefined;

      const created = await prisma.batch.create({
        data: {
          tenantId,
          productId: product.id,
          batchCode: `${product.sku}-${padCode(index, 2)}`,
          code,
          expiryDate,
        },
      });

      batches.push({
        id: created.id,
        batchCode: created.batchCode,
        expiryDate: created.expiryDate ?? undefined,
      });
    }

    if (batches.length > 0) {
      batchMap.set(product.id, batches);
    }
  }

  return batchMap;
}

async function ensureInventoryForProducts(
  prisma: PrismaService,
  tenantId: string,
  warehouseId: string,
  locations: Array<{ id: string }>,
  products: SeedProduct[],
  batchMap?: Map<string, SeedBatch[]>,
) {
  if (locations.length === 0 || products.length === 0) {
    return;
  }

  const existing = await prisma.inventory.findMany({
    where: { tenantId, productId: { in: products.map((product) => product.id) } },
    select: { productId: true },
  });
  const existingProductIds = new Set(existing.map((item) => item.productId));

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    if (existingProductIds.has(product.id)) {
      continue;
    }
    const location = locations[i % locations.length];
    const quantity = new Prisma.Decimal(60 + i * 4);
    const batches = batchMap?.get(product.id) ?? [];
    const batch = batches.length ? batches[i % batches.length] : undefined;
    const data: Prisma.InventoryUncheckedCreateInput = {
      tenantId,
      productId: product.id,
      warehouseId,
      locationId: location.id,
      quantity,
      uom: 'EA',
      stockStatus: StockStatus.AVAILABLE,
    };
    if (batch?.id) {
      data.batchId = batch.id;
    }
    await prisma.inventory.create({ data });
  }
}

async function ensureDemoMovements(
  prisma: PrismaService,
  tenant: { id: string },
  warehouseId: string,
  locations: Array<{ id: string; zone?: string | null }>,
  products: SeedProduct[],
  batchMap?: Map<string, SeedBatch[]>,
  reasonMap?: Map<string, string>,
) {
  if (locations.length === 0 || products.length === 0) {
    return;
  }

  if (reasonMap && reasonMap.size > 0) {
    await assignDemoMovementReasons(prisma, tenant.id, reasonMap);
  }

  const existingCount = await prisma.movementHeader.count({
    where: { tenantId: tenant.id, reference: { startsWith: DEMO_MOVE_PREFIX } },
  });
  if (existingCount >= DEMO_MOVEMENT_TARGET) {
    return;
  }

  const pickingLocations = locations.filter((location) => location.zone === 'PICK');
  const reserveLocations = locations.filter((location) => location.zone === 'RES');
  const shippingLocations = locations.filter((location) => location.zone === 'SHIP');
  const movementTypes = [
    MovementType.INBOUND_RECEIPT,
    MovementType.OUTBOUND_SHIPMENT,
    MovementType.INTERNAL_TRANSFER,
    MovementType.ADJUSTMENT,
  ];
  const movementStatuses = [
    MovementStatus.COMPLETED,
    MovementStatus.COMPLETED,
    MovementStatus.PENDING,
    MovementStatus.COMPLETED,
    MovementStatus.CANCELLED,
  ];

  for (let i = existingCount + 1; i <= DEMO_MOVEMENT_TARGET; i += 1) {
    const movementType = movementTypes[(i - 1) % movementTypes.length];
    const status = movementStatuses[(i - 1) % movementStatuses.length];
    const movementTimestamp = buildMovementTimestamp(i);
    const reasonId = reasonMap?.get(DEMO_REASON_BY_TYPE[movementType]);
    const header = await prisma.movementHeader.create({
      data: {
        tenantId: tenant.id,
        warehouseId,
        movementType,
        status,
        reference: `${DEMO_MOVE_PREFIX}${padCode(i, 3)}`,
        reasonId,
        notes: i % 4 === 0 ? 'Movimiento demo generado automaticamente' : null,
        createdAt: movementTimestamp,
        updatedAt: movementTimestamp,
      },
    });

    const lineCount = 1 + ((i * 7) % 5);
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const product = products[(i + lineIndex - 1) % products.length];
      const fromLocation = pickingLocations[(i + lineIndex - 1) % pickingLocations.length] ?? locations[0];
      const reserveLocation = reserveLocations[(i + lineIndex - 1) % reserveLocations.length] ?? locations[0];
      const shippingLocation = shippingLocations[(i + lineIndex - 1) % shippingLocations.length] ?? locations[0];
      const quantity = new Prisma.Decimal(4 + i + lineIndex);
      const batches = batchMap?.get(product.id) ?? [];
      const batch = batches.length ? batches[(i + lineIndex - 1) % batches.length] : undefined;
      const lineTimestamp = new Date(movementTimestamp.getTime() + lineIndex * 2 * 60 * 1000);

      const lineData: Prisma.MovementLineCreateInput = {
        tenant: { connect: { id: tenant.id } },
        movementHeader: { connect: { id: header.id } },
        product: { connect: { id: product.id } },
        quantity,
        uom: 'EA',
        createdAt: lineTimestamp,
        updatedAt: lineTimestamp,
      };

      if (movementType === MovementType.INBOUND_RECEIPT) {
        lineData.toLocation = { connect: { id: reserveLocation.id } };
      } else if (movementType === MovementType.OUTBOUND_SHIPMENT) {
        lineData.fromLocation = { connect: { id: fromLocation.id } };
        lineData.toLocation = { connect: { id: shippingLocation.id } };
      } else if (movementType === MovementType.INTERNAL_TRANSFER) {
        lineData.fromLocation = { connect: { id: reserveLocation.id } };
        lineData.toLocation = { connect: { id: fromLocation.id } };
      } else {
        lineData.fromLocation = { connect: { id: fromLocation.id } };
      }

      if (batch) {
        lineData.batch = { connect: { id: batch.id } };
        lineData.batchCode = batch.batchCode;
        if (batch.expiryDate) {
          lineData.expiryDate = batch.expiryDate;
        }
      }

      await prisma.movementLine.create({ data: lineData });
    }
  }
}

async function ensureFullAccessRole(
  prisma: PrismaService,
  tenantId: string,
  name: string,
  description: string,
) {
  const existing = await prisma.role.findFirst({ where: { tenantId, name } });
  if (existing) {
    return existing;
  }

  const role = await prisma.role.create({
    data: { tenantId, name, description, isSystem: true },
  });

  const permissionResources = Object.values(PermissionResource) as PermissionResource[];
  const permissionActions = Object.values(PermissionAction) as PermissionAction[];
  await prisma.rolePermission.createMany({
    data: permissionResources.flatMap((resource) =>
      permissionActions.map((action) => ({
        roleId: role.id,
        resource,
        action,
      })),
    ),
  });

  return role;
}

async function ensureSubscriptionPlans(prisma: PrismaService) {
  for (const plan of PLAN_DEFS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        maxWarehouses: plan.maxWarehouses,
        maxUsers: plan.maxUsers,
        maxApiKeys: plan.maxApiKeys,
        maxMonthlyOrders: plan.maxMonthlyOrders,
        maxMonthlyShipments: plan.maxMonthlyShipments,
        maxIntegrations: plan.maxIntegrations,
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        maxWarehouses: plan.maxWarehouses,
        maxUsers: plan.maxUsers,
        maxApiKeys: plan.maxApiKeys,
        maxMonthlyOrders: plan.maxMonthlyOrders,
        maxMonthlyShipments: plan.maxMonthlyShipments,
        maxIntegrations: plan.maxIntegrations,
        isActive: true,
      },
    });
  }
}

async function seedTenantData(prisma: PrismaService, tenant: { id: string; name: string }) {
  const existingDemoProducts = await prisma.product.findMany({
    where: { tenantId: tenant.id, sku: { startsWith: DEMO_SKU_PREFIX } },
  });
  const hasDemoSeed = existingDemoProducts.length > 0;

  const warehouseDefs = [
    { code: 'WH-01', name: `${tenant.name} Central` },
    { code: 'WH-02', name: `${tenant.name} Secundaria` },
  ];

  const warehouses = [];
  for (const warehouseDef of warehouseDefs) {
    const found = await prisma.warehouse.findFirst({
      where: { tenantId: tenant.id, code: warehouseDef.code },
    });
    if (found) {
      warehouses.push(found);
      continue;
    }
    const created = await prisma.warehouse.create({
      data: {
        tenantId: tenant.id,
        code: warehouseDef.code,
        name: warehouseDef.name,
        isActive: true,
      },
    });
    warehouses.push(created);
  }

  const primaryWarehouse = warehouses[0];
  if (!primaryWarehouse) {
    throw new Error(`No warehouse created for ${tenant.name}`);
  }

  const zoneTemplates = [
    {
      code: 'REC',
      name: 'Recepcion',
      zoneType: ZoneType.RECEIVING,
      allowInbound: true,
      allowPicking: false,
      allowStorage: false,
      allowReturns: false,
    },
    {
      code: 'PICK',
      name: 'Picking',
      zoneType: ZoneType.PICKING,
      allowInbound: false,
      allowPicking: true,
      allowStorage: false,
      allowReturns: false,
    },
    {
      code: 'RES',
      name: 'Reserva',
      zoneType: ZoneType.RESERVE,
      allowInbound: false,
      allowPicking: false,
      allowStorage: true,
      allowReturns: false,
    },
    {
      code: 'SHIP',
      name: 'Despacho',
      zoneType: ZoneType.SHIPPING,
      allowInbound: false,
      allowPicking: false,
      allowStorage: false,
      allowReturns: false,
    },
    {
      code: 'QA',
      name: 'Calidad',
      zoneType: ZoneType.OTHER,
      allowInbound: false,
      allowPicking: false,
      allowStorage: false,
      allowReturns: true,
    },
  ];

  for (const zone of zoneTemplates) {
    const exists = await prisma.warehouseZoneConfig.findFirst({
      where: { tenantId: tenant.id, warehouseId: primaryWarehouse.id, code: zone.code },
    });
    if (!exists) {
      await prisma.warehouseZoneConfig.create({
        data: {
          tenantId: tenant.id,
          warehouseId: primaryWarehouse.id,
          code: zone.code,
          name: zone.name,
          zoneType: zone.zoneType,
          allowInbound: zone.allowInbound,
          allowPicking: zone.allowPicking,
          allowStorage: zone.allowStorage,
          allowReturns: zone.allowReturns,
        },
      });
    }
  }

  const zoneCodes = zoneTemplates.map((zone) => zone.code);
  const locations = [];
  for (const zoneCode of zoneCodes) {
    for (let i = 1; i <= 6; i += 1) {
      const code = `${zoneCode}-${padCode(i)}`;
      const existingLocation = await prisma.location.findFirst({
        where: { tenantId: tenant.id, warehouseId: primaryWarehouse.id, code },
      });
      if (existingLocation) {
        locations.push(existingLocation);
        continue;
      }
      const created = await prisma.location.create({
        data: {
          tenantId: tenant.id,
          warehouseId: primaryWarehouse.id,
          code,
          zone: zoneCode,
          description: `${zoneCode} Slot ${padCode(i)}`,
          isActive: true,
        },
      });
      locations.push(created);
    }
  }

  const { products } = await ensureDemoProducts(prisma, tenant.id, DEMO_PRODUCT_TARGET);
  const batchMap = await ensureDemoBatches(prisma, tenant.id, products);
  const reasonMap = await ensureMovementReasons(prisma, tenant.id);

  if (hasDemoSeed) {
    await ensureInventoryForProducts(
      prisma,
      tenant.id,
      primaryWarehouse.id,
      locations,
      products,
      batchMap,
    );
    await ensureDemoMovements(prisma, tenant, primaryWarehouse.id, locations, products, batchMap, reasonMap);
    console.log(`Added demo products/movements for ${tenant.name}`);
    return;
  }

  const customers = [];
  const customerDefs = [
    { code: 'CUST-001', name: 'Retail Norte' },
    { code: 'CUST-002', name: 'Market Sur' },
  ];
  for (const customerDef of customerDefs) {
    const existingCustomer = await prisma.customer.findFirst({
      where: { tenantId: tenant.id, code: customerDef.code },
    });
    if (existingCustomer) {
      customers.push(existingCustomer);
      continue;
    }
    const created = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        code: customerDef.code,
        name: customerDef.name,
      },
    });
    customers.push(created);
  }

  const pickingLocations = locations.filter((location) => location.zone === 'PICK');
  const reserveLocations = locations.filter((location) => location.zone === 'RES');

  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const location = pickingLocations[i % pickingLocations.length] ?? locations[i % locations.length];
    const quantity = new Prisma.Decimal(80 + i * 5);
    const batches = batchMap.get(product.id) ?? [];
    const batch = batches.length ? batches[i % batches.length] : undefined;
    const data: Prisma.InventoryUncheckedCreateInput = {
      tenantId: tenant.id,
      productId: product.id,
      warehouseId: primaryWarehouse.id,
      locationId: location.id,
      quantity,
      uom: 'EA',
      stockStatus: StockStatus.AVAILABLE,
    };
    if (batch?.id) {
      data.batchId = batch.id;
    }
    await prisma.inventory.create({ data });
  }

  const inboundReceipt = await prisma.inboundReceipt.create({
    data: {
      tenantId: tenant.id,
      warehouseId: primaryWarehouse.id,
      status: InboundReceiptStatus.RECEIVED,
      receivedAt: new Date(),
    },
  });

  const inboundProducts = products.slice(0, Math.min(products.length, 6));
  await prisma.inboundReceiptLine.createMany({
    data: inboundProducts.map((product, index) => {
      const batches = batchMap.get(product.id) ?? [];
      const batch = batches.length ? batches[index % batches.length] : undefined;
      return {
        tenantId: tenant.id,
        inboundReceiptId: inboundReceipt.id,
        productId: product.id,
        expectedQty: new Prisma.Decimal(50 + index * 10),
        receivedQty: new Prisma.Decimal(50 + index * 10),
        uom: 'EA',
        batchId: batch?.id,
        batchCode: batch?.batchCode,
        expiryDate: batch?.expiryDate ?? undefined,
      };
    }),
  });

  const now = new Date();
  const orderDefs: Array<{ status: OutboundOrderStatus; days: number; ref: string }> = [
    { status: OutboundOrderStatus.RELEASED, days: 1, ref: 'SO-1001' },
    { status: OutboundOrderStatus.PICKING, days: 0, ref: 'SO-1002' },
    { status: OutboundOrderStatus.PICKED, days: -1, ref: 'SO-1003' },
    { status: OutboundOrderStatus.FULLY_ALLOCATED, days: 2, ref: 'SO-1004' },
  ];

  const outboundOrders: { order: any; lines: any[] }[] = [];
  for (let i = 0; i < orderDefs.length; i += 1) {
    const definition = orderDefs[i];
    const requestedShipDate = new Date(now);
    requestedShipDate.setDate(now.getDate() + definition.days);

    const order = await prisma.outboundOrder.create({
      data: {
        tenantId: tenant.id,
        warehouseId: primaryWarehouse.id,
        status: definition.status,
        customerId: customers[i % customers.length]?.id,
        customerRef: customers[i % customers.length]?.code,
        externalRef: definition.ref,
        requestedShipDate,
      },
    });

    const orderProducts = products.slice(i, i + 2);
    const lines = [];
    for (const product of orderProducts) {
      const requestedQty = new Prisma.Decimal(20 + i * 5);
      const pickedQty =
        definition.status === OutboundOrderStatus.PICKED ||
        definition.status === OutboundOrderStatus.PARTIALLY_PICKED
          ? requestedQty
          : definition.status === OutboundOrderStatus.PICKING
          ? new Prisma.Decimal(10)
          : new Prisma.Decimal(0);
      const line = await prisma.outboundOrderLine.create({
        data: {
          tenantId: tenant.id,
          outboundOrderId: order.id,
          productId: product.id,
          requestedQty,
          pickedQty,
          uom: 'EA',
        },
      });
      lines.push(line);
    }

    outboundOrders.push({ order, lines });
  }

  const completedOrders = outboundOrders.filter(
    (item) => item.order.status === OutboundOrderStatus.PICKED || item.order.status === OutboundOrderStatus.PICKING,
  );

  for (const entry of completedOrders) {
    const startedAt = new Date(now);
    startedAt.setHours(now.getHours() - 2);
    const completedAt = new Date(now);
    completedAt.setHours(now.getHours() - 1);

    const task = await prisma.pickingTask.create({
      data: {
        tenantId: tenant.id,
        warehouseId: primaryWarehouse.id,
        outboundOrderId: entry.order.id,
        status: PickingTaskStatus.COMPLETED,
        startedAt,
        completedAt,
      },
    });

    for (const line of entry.lines) {
      const location = pickingLocations[0] ?? locations[0];
      await prisma.pickingTaskLine.create({
        data: {
          tenantId: tenant.id,
          pickingTaskId: task.id,
          outboundOrderLineId: line.id,
          productId: line.productId,
          fromLocationId: location.id,
          quantityToPick: line.requestedQty,
          quantityPicked: line.pickedQty,
          uom: 'EA',
        },
      });
    }
  }

  for (const type of [MovementType.INBOUND_RECEIPT, MovementType.OUTBOUND_SHIPMENT, MovementType.ADJUSTMENT]) {
    const header = await prisma.movementHeader.create({
      data: {
        tenantId: tenant.id,
        warehouseId: primaryWarehouse.id,
        movementType: type,
        status: MovementStatus.COMPLETED,
      },
    });
    const movementProduct = products[0];
    const location = reserveLocations[0] ?? locations[0];
    await prisma.movementLine.create({
      data: {
        tenantId: tenant.id,
        movementHeaderId: header.id,
        productId: movementProduct.id,
        quantity: new Prisma.Decimal(5),
        uom: 'EA',
        fromLocationId: location.id,
      },
    });
  }

  await ensureDemoMovements(prisma, tenant, primaryWarehouse.id, locations, products, batchMap, reasonMap);

  const policy = await prisma.replenishmentPolicy.create({
    data: {
      tenantId: tenant.id,
      warehouseId: primaryWarehouse.id,
      productId: products[0].id,
      method: ReplenishmentMethod.MIN_MAX,
      minQty: 50,
      maxQty: 120,
      safetyStock: 20,
    },
  });

  await prisma.replenishmentSuggestion.create({
    data: {
      tenantId: tenant.id,
      warehouseId: primaryWarehouse.id,
      productId: products[0].id,
      policyId: policy.id,
      suggestedQty: 30,
      reason: 'Nivel bajo de stock',
      status: ReplenishmentStatus.PENDING,
    },
  });

  await prisma.wave.create({
    data: {
      tenantId: tenant.id,
      warehouseId: primaryWarehouse.id,
      strategy: WavePickingStrategy.BY_ROUTE,
      status: WaveStatus.RELEASED,
      totalOrders: 2,
      totalLines: 4,
      totalUnits: 80,
    },
  });

  const shipmentOrder = outboundOrders.find((item) => item.order.status === OutboundOrderStatus.PICKED);
  if (shipmentOrder) {
    const handlingUnit = await prisma.handlingUnit.create({
      data: {
        tenantId: tenant.id,
        warehouseId: primaryWarehouse.id,
        handlingUnitType: HandlingUnitType.PALLET,
        code: `HU-${padCode(1, 3)}`,
      },
    });

    const shipment = await prisma.shipment.create({
      data: {
        tenantId: tenant.id,
        warehouseId: primaryWarehouse.id,
        status: ShipmentStatus.DISPATCHED,
        scheduledDeparture: new Date(now.getTime() - 1000 * 60 * 60),
        actualDeparture: new Date(now.getTime() - 1000 * 60 * 120),
      },
    });

    await prisma.shipmentHandlingUnit.create({
      data: {
        tenantId: tenant.id,
        shipmentId: shipment.id,
        handlingUnitId: handlingUnit.id,
        outboundOrderId: shipmentOrder.order.id,
      },
    });
  }

  const adjustmentLocation = reserveLocations[0] ?? locations[0];
  await prisma.inventoryAdjustment.create({
    data: {
      tenantId: tenant.id,
      warehouseId: primaryWarehouse.id,
      productId: products[0].id,
      locationId: adjustmentLocation.id,
      adjustmentType: AdjustmentType.CORRECTION,
      previousQty: new Prisma.Decimal(100),
      newQty: new Prisma.Decimal(95),
      differenceQty: new Prisma.Decimal(-5),
      reason: 'picking error - conteo',
    },
  });

  console.log(`Seeded operational data for ${tenant.name}`);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const prisma = app.get(PrismaService);
  const onboardingService = app.get(OnboardingService);
  const rbacService = app.get(RbacService);
  const userAccountService = app.get(UserAccountService);
  const tenantFilter = resolveTenantFilter();

  await ensureSubscriptionPlans(prisma);

  let platformTenant = await prisma.tenant.findFirst({ where: { name: PLATFORM_TENANT_NAME } });

  if (!platformTenant) {
    const tenantCount = await prisma.tenant.count();
    if (tenantCount === 0) {
      const created = await onboardingService.registerTenant({
        companyName: PLATFORM_TENANT_NAME,
        adminName: OWNER_NAME,
        adminEmail: OWNER_EMAIL,
        adminPassword: OWNER_PASSWORD,
        planCode: PlanCode.ENTERPRISE,
        billingEmail: OWNER_EMAIL,
      });
      platformTenant = await prisma.tenant.findUnique({ where: { id: created.tenantId } });
      console.log(`Created platform tenant: ${created.tenantId}`);
    } else {
      platformTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      console.log(`Using existing tenant as platform: ${platformTenant?.id ?? 'not-found'}`);
    }
  }

  if (!platformTenant) {
    throw new Error('No platform tenant available to assign OWNER.');
  }

  const ownerRole = await ensureFullAccessRole(
    prisma,
    platformTenant.id,
    ROLE_OWNER,
    'Platform owner with global access',
  );
  await ensureFullAccessRole(
    prisma,
    platformTenant.id,
    ROLE_PLATFORM_ADMIN,
    'Platform administrator with global access',
  );

  let ownerUser = await prisma.user.findFirst({
    where: { tenantId: platformTenant.id, email: OWNER_EMAIL },
  });

  if (!ownerUser) {
    ownerUser = await userAccountService.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      tenantId: platformTenant.id,
      isActive: true,
    });
    console.log(`Created owner user: ${OWNER_EMAIL}`);
  }

  if (!ownerUser) {
    throw new Error(`Owner user could not be created for ${OWNER_EMAIL}`);
  }
  await rbacService.assignRoleToUser(platformTenant.id, { userId: ownerUser.id, roleId: ownerRole.id });
  console.log(`Ensured OWNER role for ${OWNER_EMAIL}`);

  if (tenantFilter) {
    const normalized = tenantFilter.trim().toLowerCase();
    const demoMatch = DEMO_TENANTS.find((tenant) => tenant.name.toLowerCase() === normalized);
    let record = null;

    if (demoMatch) {
      record = await prisma.tenant.findFirst({ where: { name: demoMatch.name } });
      if (!record) {
        const result = await onboardingService.registerTenant({
          companyName: demoMatch.name,
          adminName: demoMatch.adminName,
          adminEmail: demoMatch.adminEmail,
          adminPassword: demoMatch.adminPassword,
          planCode: demoMatch.planCode,
          billingEmail: demoMatch.adminEmail,
        });
        record = await prisma.tenant.findUnique({ where: { id: result.tenantId } });
        console.log(`Created demo tenant: ${demoMatch.name} (${result.tenantId})`);
      }
    } else {
      record = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: tenantFilter },
            { name: { equals: tenantFilter, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!record) {
      console.log(`Tenant not found for --tenant ${tenantFilter}`);
      await app.close();
      return;
    }

    await seedTenantData(prisma, { id: record.id, name: record.name });
    await app.close();
    return;
  }

  for (const tenant of DEMO_TENANTS) {
    const exists = await prisma.tenant.findFirst({ where: { name: tenant.name } });
    if (exists) {
      console.log(`Skipped existing tenant: ${tenant.name}`);
      continue;
    }

    const result = await onboardingService.registerTenant({
      companyName: tenant.name,
      adminName: tenant.adminName,
      adminEmail: tenant.adminEmail,
      adminPassword: tenant.adminPassword,
      planCode: tenant.planCode,
      billingEmail: tenant.adminEmail,
    });
    console.log(`Created demo tenant: ${tenant.name} (${result.tenantId})`);
  }

  for (const tenant of DEMO_TENANTS) {
    const record = await prisma.tenant.findFirst({ where: { name: tenant.name } });
    if (record) {
      await seedTenantData(prisma, { id: record.id, name: record.name });
    }
  }

  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
