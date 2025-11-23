# AWMSOM - Sistema de Gestión de Almacenes

AWMSOM es una base para un WMS modular escrito en NestJS y TypeScript. El objetivo es ofrecer control de inventario en tiempo real, manejo de lotes/fechas de expiración y trazabilidad de movimientos en procesos de inbound, inventario interno y outbound.

## Características
- Arquitectura limpia/hexagonal con separación de dominio, aplicación e infraestructura.
- PostgreSQL con Prisma ORM para persistencia y migraciones.
- Validación estricta con `class-validator` y manejo centralizado de errores.
- Módulos extensibles para autenticación, catálogos, inbound, inventario y outbound.

## Requisitos
- Node.js 20+
- PostgreSQL accesible y variable `DATABASE_URL` configurada (por ejemplo `postgresql://user:pass@localhost:5432/awmsom`).

### Variables de entorno clave
- `AUDIT_LOG_ENCRYPTION_KEY`: cadena base64 de 32 bytes (AES-256) usada para cifrar en reposo la metadata de auditoría.
- `AUDIT_LOG_RETENTION_DAYS`: ventana de retención en días para calcular `expiresAt` y el purgado automático de auditoría (por defecto 365).

## Puesta en marcha
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Generar cliente Prisma y aplicar migraciones:
   ```bash
   npm run prisma:generate
   npx prisma migrate deploy
   ```
3. Ejecutar en modo desarrollo con recarga en caliente:
   ```bash
   npm run start:dev
   ```
4. Compilar y ejecutar la versión productiva:
   ```bash
   npm run build
   npm start
   ```

## Pruebas y calidad
- Ejecutar pruebas unitarias/Jest:
  ```bash
  npm test
  ```
- Ejecutar linting de TypeScript:
  ```bash
  npm run lint
  ```

## Documentación
- Arquitectura: [docs/architecture.md](docs/architecture.md)
- Planeación y trazabilidad de sprints: [docs/sprints.md](docs/sprints.md)
- Detalle del Sprint 4: [docs/sprint4.md](docs/sprint4.md)
