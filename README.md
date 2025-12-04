# AWMSOM - Sistema de Gestión de Almacenes

AWMSOM es una base para un WMS modular escrito en NestJS y TypeScript con un frontend en Next.js. El objetivo es ofrecer control de inventario en tiempo real, manejo de lotes/fechas de expiración y trazabilidad de movimientos en procesos de inbound, inventario interno y outbound.

## Características clave
- Arquitectura limpia/hexagonal con separación de dominio, aplicación e infraestructura.
- PostgreSQL con Prisma ORM para persistencia y migraciones.
- Validación estricta con `class-validator` y manejo centralizado de errores.
- Módulos extensibles para autenticación, catálogos, inbound, inventario y outbound.
- Frontend React/Next.js listo para OAuth, theming y consumo de la API.

## Arquitectura y componentes
- **Backend (NestJS)**: expone APIs REST para catálogos, inbound/outbound, inventario, monitoreo y autenticación. La lógica de negocio vive en servicios de aplicación sobre repositorios Prisma.
- **Frontend (Next.js 14)**: panel operativo con React Query y Tailwind. Consume la API vía `NEXT_PUBLIC_API_URL` y usa rutas de API Next para flujos de autenticación/OAuth.
- **Base de datos**: PostgreSQL accesible mediante la variable `DATABASE_URL` con esquemas y migraciones gestionadas por Prisma.

### Flujos operativos principales
- **Inbound**: creación y confirmación de recibos (`/inbound/receipts`) que generan movimientos `INBOUND_RECEIPT` y aumentan stock disponible.
- **Inventario interno**: conteos cíclicos y ajustes (`/inventory/cycle-counts`, `/inventory/adjustments`) que afectan cantidades y lotes con validaciones de estado.
- **Outbound**: liberación de órdenes y tareas de picking (`/outbound/orders`, `/outbound/picking-tasks`), selección FEFO y registro de salidas; incluye empaquetado y embarques.
- **Catálogos y salud**: módulos de productos, ubicaciones, almacenes y endpoints `/health` para validar disponibilidad.

## Configuración de entorno
Crea un archivo `.env` en la raíz del backend con las variables mínimas (ver `configuration/env.sample` para más detalles):
```bash
# Claves críticas
JWT_SECRET="please-change-me-to-a-strong-random-secret-at-least-32-chars"
TOTP_ENCRYPTION_KEY="changemechangemechangemechangeme"
AUDIT_LOG_ENCRYPTION_KEY="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=" # base64 de 32 bytes (AES-256)

# Persistencia y Redis
DATABASE_URL="postgresql://user:pass@localhost:5432/awmsom"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Retención y umbrales con valores por defecto opcionales
AUDIT_LOG_RETENTION_DAYS=365
RBAC_EXCESSIVE_PERMISSION_THRESHOLD=20
KPIS_CACHE_TTL=300
TRACE_CACHE_TTL=120
```
Frontend (carpeta `frontend/`) debe crear `frontend/.env.local` (o definir variables de entorno) y pegar las variables públicas para apuntar al backend y OAuth. Ejemplo listo para copiar:
```bash
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_OAUTH_AUTHORIZE_URL="http://localhost:3000/auth/oauth/authorize" # opcional si se delega en otro IdP
```

Para habilitar el flujo OAuth del backend se espera la configuración del proveedor por defecto (`oidc-demo`). Al activar
`OAUTH_FLOW_ENABLED`, se deben declarar los endpoints y credenciales del IdP:

```bash
OAUTH_FLOW_ENABLED=true
OAUTH_OIDC_DEMO_AUTHORIZE_URL=https://oidc-demo.example.com/authorize
OAUTH_OIDC_DEMO_SECRET=please-change-this-oidc-demo-secret
OAUTH_OIDC_DEMO_AUDIENCE=awmsom-api
```

## Puesta en marcha del backend
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

## Puesta en marcha del frontend
1. Instalar dependencias (desde `frontend/`):
   ```bash
   cd frontend
   npm install
   ```
2. Ejecutar en desarrollo (requiere el backend en `NEXT_PUBLIC_API_URL`):
   ```bash
   npm run dev
   ```
3. Build y arranque en modo producción:
   ```bash
   npm run build
   npm start
   ```

## Uso rápido de la API
1. **Crear un almacén y producto base**
   ```bash
   curl -X POST http://localhost:3000/warehouses -H "Content-Type: application/json" -d '{"code":"DC-MAIN","name":"Centro de Distribución"}'
   curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"sku":"SKU-001","name":"Producto demo"}'
   ```
2. **Registrar y confirmar un recibo inbound**
   ```bash
   RECEIPT_ID=$(curl -s -X POST http://localhost:3000/inbound/receipts -H "Content-Type: application/json" -d '{"warehouseId":1,"supplier":"Proveedor A"}' | jq -r '.id')
   curl -X POST http://localhost:3000/inbound/receipts/$RECEIPT_ID/lines -H "Content-Type: application/json" -d '{"productId":1,"quantity":10,"locationId":1}'
   curl -X POST http://localhost:3000/inbound/receipts/$RECEIPT_ID/confirm
   ```
3. **Liberar una orden outbound y generar picking**
   ```bash
   ORDER_ID=$(curl -s -X POST http://localhost:3000/outbound/orders -H "Content-Type: application/json" -d '{"warehouseId":1,"customer":"Cliente 1","lines":[{"productId":1,"quantity":2}]}' | jq -r '.id')
   curl -X POST http://localhost:3000/outbound/orders/$ORDER_ID/release
   curl -X POST http://localhost:3000/outbound/orders/$ORDER_ID/create-picking-task
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
- Pruebas del frontend:
  ```bash
  cd frontend && npm run lint
  ```

## Documentación
- Arquitectura: [docs/architecture.md](docs/architecture.md)
- Planeación y trazabilidad de sprints: [docs/sprints.md](docs/sprints.md)
- Detalle del Sprint 4: [docs/sprint4.md](docs/sprint4.md)
- Detalle del Sprint 5: [docs/sprint5.md](docs/sprint5.md)
- Plan FE y entregables de interfaz: [docs/sprint-fe.md](docs/sprint-fe.md)
- KPIs y dashboards: [docs/kpis.md](docs/kpis.md) y [docs/dashboards](docs/dashboards)
- Runbooks operativos: [docs/runbooks](docs/runbooks)
