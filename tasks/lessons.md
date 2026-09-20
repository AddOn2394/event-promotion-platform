# Lecciones

## Levantar/reiniciar la API de desarrollo
- El `.env` de la raíz NO define `DATABASE_URL` (solo `POSTGRES_*`). Al reiniciar `dev:api` desde un shell limpio, exportarla: `postgres://event_promotion:dev_local_password@localhost:5432/event_promotion` (dev) o `.../event_promotion_test` (tests). Sin ella, todo endpoint con DB responde `500 "Error interno"` (`SASL: client password must be a string` en el log).
- Después de reiniciar, probar un endpoint con DB (p. ej. `POST /admin/auth/login`), no solo `/health` — `/health` da 200 aunque la DB esté mal configurada.
- `tsx watch` no relee el `.env`: reiniciar el proceso tras cambiar `RESEND_*`.
- Antes de decir "entorno listo", verificar de verdad con un request que use la DB.

## Correr los tests de `apps/api` desde la herramienta Bash
- Las variables exportadas NO persisten entre llamadas: `export DATABASE_URL=… FRONTEND_URL=… JWT_SECRET=… RESEND_WEBHOOK_SECRET=…` va en el mismo comando que `npx vitest run`, si no `createApp` falla con `FRONTEND_URL no está configurada`.
- Vitest fija `NODE_ENV=test`, y `enviarEmail` corta ahí con éxito simulado (Gate 8): un test que necesite un envío `fallido` debe sembrarlo por SQL, nunca depender de que el envío falle de verdad.

## Cambiar un enum compartido (estados de invitación, etc.)
- Un `Record<string, string>` sin tipar (como tenía `InvitacionesPage`) no avisa cuando se agrega un valor al enum: tiparlo `Record<EnumType, string>` para que el próximo estado sea un error de compilación.
- Antes de que un cambio de comportamiento (p. ej. `fallido → fallida`) voltee tests existentes, revisar cuáles dependen del comportamiento viejo "por accidente" y arreglar la causa (guard de `NODE_ENV`) antes de tocar el enum.
