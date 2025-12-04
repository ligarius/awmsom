# Runbook: Limpiar migraciones Prisma en estado `failed`

Este runbook describe cómo recuperar una migración de Prisma marcada como `failed`, registrando el estado correcto en `_prisma_migrations` y reintentando el despliegue.

## Precauciones y respaldo
- **Realiza un respaldo completo** de la base de datos antes de modificar manualmente el estado de las migraciones.
- Ejecuta los comandos desde la raíz del backend, con la variable `DATABASE_URL` apuntando al entorno afectado.

## Pasos
1. **Identificar la migración fallida**
   - Revisa los registros en la tabla `_prisma_migrations` para confirmar la migración en estado `failed` y su `name` (por ejemplo `20240715_api_key_hash`):
     ```sql
     SELECT id, name, finished_at, rolled_back_at, logs
     FROM _prisma_migrations
     ORDER BY started_at DESC;
     ```

2. **Resolver el estado de la migración**
   - Si la migración no aplicó cambios y debe marcarse como revertida:
     ```bash
     npx prisma migrate resolve --rolled-back 20240715_api_key_hash
     ```
   - Si la migración ya se aplicó manualmente y solo falta registrarla como exitosa:
     ```bash
     npx prisma migrate resolve --applied 20240715_api_key_hash
     ```
   - Sustituye `20240715_api_key_hash` por el nombre real de la migración.

3. **Validar el registro en `_prisma_migrations`**
   - Confirma que el registro de la migración quedó con `rolled_back_at` (si aplicaste `--rolled-back`) o con `finished_at` (si usaste `--applied`).

4. **Reintentar el despliegue**
   - Una vez resuelto el estado, vuelve a ejecutar las migraciones pendientes:
     ```bash
     npx prisma migrate deploy
     ```

5. **Verificación final**
   - Comprueba que `npx prisma migrate deploy` finaliza sin errores.
   - Revisa nuevamente `_prisma_migrations` para confirmar que no quedan migraciones en estado `failed`.

## Notas
- Evita eliminar archivos de migración ya publicados; modifica únicamente el estado registrado en `_prisma_migrations`.
- Documenta el incidente y el ajuste aplicado para futuras auditorías.
