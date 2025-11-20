# WMS Architecture Overview

This document outlines the baseline architecture for the Warehouse Management System (WMS). It codifies the mandatory principles for the initial implementation to keep the codebase modular, testable, and ready for high concurrency and multi-warehouse operations.

## Architectural Style
- **Clean/Hexagonal architecture** separating domain, application (use cases), and infrastructure concerns.
- **NestJS** as the primary framework for HTTP exposure and wiring.
- **Prisma + PostgreSQL** as the persistence adapter; repository interfaces live in the domain layer and are implemented in infrastructure.
- **Strict TypeScript** with explicit types, enums for status codes, and no `any`.

## Modules
The platform is organized into focused NestJS modules, each mapping to a business capability. Initial modules:

- **auth**: users, roles, permissions, session tokens.
- **core**: shared utilities (logging, exceptions, pagination, config, tracing helpers).
- **warehouses**: warehouses, storage areas, hierarchical locations (site → building → aisle → rack → level → bin), zones.
- **products**: SKU master data, families, logistic parameters (UOM, FEFO/FIFO policies, temperature class).
- **inventory**: stock records by SKU + lot + location + UOM + state; adjustments; cycle counts.
- **inbound**: receipts (PO/transfer/production/returns), putaway, quarantine.
- **outbound**: orders, picking strategies (wave/batch/zone), packing, shipping.
- **movements**: internal moves, replenishment to picking zones.
- **quality**: quality inspections, lot blocks, dispositions.
- **traceability**: event log and search by SKU, lot, location, user, timestamp.
- **integration**: outbound webhooks, ERP/TMS connectors, queues (future).

## Layering & Responsibilities
- **Domain layer**: Entities, value objects, domain services, repository interfaces, domain events. No NestJS or Prisma imports.
- **Application layer**: Use cases/services orchestrating domain logic; coordinates repositories and policies. Contains DTOs for use cases (not HTTP DTOs).
- **Infrastructure layer**: Adapters for Prisma repositories, HTTP controllers (NestJS), database schemas/migrations, mappers between domain and persistence/transport models.

## Data Modeling Principles
- Primary keys: UUIDs (e.g., `id` as `string`).
- Standard metadata: `createdAt`, `updatedAt`, `createdBy`, `updatedBy` where applicable.
- Inventory granularity: `sku` + `lot` + `location` + `uom` + `stockState`.
- Stock states (enum): `AVAILABLE`, `RESERVED`, `PICKING`, `IN_TRANSIT_INTERNAL`, `QUARANTINE`, `SCRAP`, `BLOCKED`.
- Lot states (enum): `NORMAL`, `BLOCKED`, `RECALL`, `UNDER_INVESTIGATION`; optional `expirationDate`.
- Movements must always be traceable: who, what, where from/to, when, and quantity.
- No negative stock; enforce FEFO by default for lot-managed products.

## HTTP API Conventions
- REST endpoints in plural (English): `/warehouses`, `/locations`, `/products`, `/inventory`, etc.
- Input/output DTOs in controllers with `class-validator` decorators; controllers delegate to application services.
- Errors returned via NestJS `HttpException` with meaningful messages and status codes.
- Support pagination (`page`, `limit`) and filtering where applicable (SKU, lot, warehouse, date, status).

## Testing Strategy
- Jest for unit tests.
- Focus on domain rules (no negative stock, blocked lots cannot move, FEFO selection) and primary use cases.
- Use given/when/then style naming and clear fixtures.

## Observability & Operations
- Structured logging (info/error/debug) with correlation IDs when available.
- Configuration via environment variables; no secrets in code.
- Ready for containerization; health checks exposed via HTTP.

## Next Steps
1. Scaffold NestJS application structure with modules above.
2. Define Prisma schema with core entities (warehouses, locations, products, lots, inventory, movements).
3. Implement first inbound receipt and putaway flow with validations and tests.
