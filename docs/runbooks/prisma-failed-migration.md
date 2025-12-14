# Runbook: Recuperar migraciones Prisma en estado `failed`

Este runbook describe cómo actuar cuando una migración de Prisma queda en estado `failed` (por ejemplo, error P3009), registrando el estado correcto en `_prisma_migrations` y reintentando el despliegue.

## Precauciones y respaldo
- **Realiza un respaldo completo** de la base de datos antes de modificar manualmente el estado de las migraciones.
- Ejecuta los comandos desde la raíz del backend, con la variable `DATABASE_URL` apuntando al entorno afectado.

## Procedimiento
1. **Verificar el estado actual en `_prisma_migrations`**
   - Confirma qué migración está en `failed` y su `name` (por ejemplo `20240715_api_key_hash`):
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

3. **Validar la resolución en `_prisma_migrations`**
   - Verifica que la migración quedó con `rolled_back_at` (si aplicaste `--rolled-back`) o con `finished_at` (si usaste `--applied`).

4. **Reintentar el despliegue**
   - Ejecuta nuevamente las migraciones pendientes:
     ```bash
     npx prisma migrate deploy
     ```

5. **Verificación final**
   - Confirma que `npx prisma migrate deploy` finaliza sin errores.
   - Revisa otra vez `_prisma_migrations` para asegurar que no quedan migraciones en estado `failed`.

## Notas
- Evita eliminar archivos de migración ya publicados; modifica únicamente el estado registrado en `_prisma_migrations`.
- Documenta el incidente y el ajuste aplicado para futuras auditorías.
