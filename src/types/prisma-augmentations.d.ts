import '@prisma/client';

declare module '@prisma/client' {
  export enum HandlingUnitType {
    BOX = 'BOX',
    PALLET = 'PALLET',
  }

  export enum ShipmentStatus {
    PLANNED = 'PLANNED',
    LOADING = 'LOADING',
    DISPATCHED = 'DISPATCHED',
    CANCELLED = 'CANCELLED',
  }

  export type HandlingUnitWhereInput = Record<string, any>;
  export type ShipmentWhereInput = Record<string, any>;

  namespace Prisma {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface HandlingUnitWhereInput extends Record<string, any> {}
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface ShipmentWhereInput extends Record<string, any> {}
  }

  interface PrismaClient {
    handlingUnit: any;
    handlingUnitLine: any;
    shipment: any;
    shipmentHandlingUnit: any;
  }
}
