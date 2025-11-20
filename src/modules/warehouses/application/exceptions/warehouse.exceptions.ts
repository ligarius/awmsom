export class WarehouseNotFoundError extends Error {
  constructor(message = 'Warehouse not found') {
    super(message);
    this.name = 'WarehouseNotFoundError';
  }
}

export class WarehouseCodeAlreadyExistsError extends Error {
  constructor(message = 'Warehouse code already exists') {
    super(message);
    this.name = 'WarehouseCodeAlreadyExistsError';
  }
}
