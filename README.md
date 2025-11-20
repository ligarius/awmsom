# AWMSOM - Warehouse Management System

This repository contains the baseline architecture and documentation for a modular, enterprise-grade Warehouse Management System (WMS) built with NestJS and TypeScript. The system targets real-time inventory control, lot/expiration handling, and full traceability across inbound, outbound, and internal movement processes.

## Highlights
- Clean/hexagonal architecture with clear separation of domain, application, and infrastructure layers.
- PostgreSQL with Prisma ORM for persistence and migrations.
- Strict TypeScript, DTO validation with `class-validator`, and centralized error handling.
- Extensible module set covering auth, warehouses, products, inventory, inbound, outbound, movements, quality, traceability, and integration.

## Documentation
See [docs/architecture.md](docs/architecture.md) for the architectural blueprint and next steps.
