# Sprint FE - Panel operativo

## Objetivo
Entregar una primera versión navegable del panel FE que consuma la API NestJS y habilite autenticación OAuth, monitoreo básico y flujos críticos de inbound/outbound.

## Alcance y entregables
- **Autenticación y sesión**
  - Login con NextAuth/OAuth usando `NEXT_PUBLIC_OAUTH_AUTHORIZE_URL` y cookies de sesión en rutas de API.
  - Guardas de ruta y refresco de sesión con `@tanstack/react-query` en el provider.
- **Dashboard operativo**
  - Home con KPIs de recibos abiertos, tareas de picking y ajustes pendientes.
  - Navegación a módulos de inbound, inventario y outbound con filtros de almacén.
- **Flujos críticos**
  - Crear/confirmar recibos inbound, mostrando lotes y ubicaciones disponibles.
  - Listar órdenes outbound, liberar y crear tareas de picking con detalle por línea.
  - Registro rápido de ajustes de inventario y conteos cíclicos.
- **UX y componentes**
  - Layout responsive con Tailwind y componentes Radix (Select, Dialog, Toast).
  - Feedback de errores y estados vacíos para listados.

## Historias de usuario
1. **Como operador, quiero autenticarme y mantener mi sesión** para acceder a los módulos del WMS sin perder contexto tras un refresh.
2. **Como responsable de inbound, quiero registrar y confirmar recibos** desde el panel para ver disponibilidad actualizada.
3. **Como coordinador de outbound, quiero liberar órdenes y generar picking** con visibilidad de lotes y cantidades asignadas.
4. **Como analista, quiero ver KPIs de operación** para priorizar tareas y detectar bloqueos.

## Dependencias técnicas
- Backend desplegado accesible en `NEXT_PUBLIC_API_URL` con salud OK.
- Variables de OAuth configuradas (`NEXT_PUBLIC_OAUTH_AUTHORIZE_URL`, secret del proveedor en backend si aplica).
- Datos de catálogos mínimos: almacén, ubicaciones y productos creados.

## Plan de pruebas
- Lint y type-check del frontend (`npm run lint`).
- Smoke manual sobre flujos: login, creación/confirmación de recibo, liberación de orden y generación de picking.
- Validar manejo de estados vacíos y errores 401/403/404.

## Riesgos y mitigaciones
- **Inestabilidad de API**: usar mocks simples en React Query para desarrollo local cuando el backend no esté disponible.
- **Desfase de esquemas**: versionar contratos en `frontend/src/types` alineados con DTOs del backend.
- **OAuth externo**: documentar callback y dominios permitidos; fallback a login local si el IdP no responde.

## Métricas de salida
- Tiempo de carga inicial del dashboard < 2s en entorno local.
- Cobertura mínima de linting y type-check sin errores.
- KPIs y listados renderizados con datos reales provenientes del backend.
