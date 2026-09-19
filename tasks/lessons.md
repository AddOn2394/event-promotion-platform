# Lecciones

## Levantar/reiniciar la API de desarrollo
- El `.env` de la raíz NO define `DATABASE_URL` (solo `POSTGRES_*`). Al reiniciar `dev:api` desde un shell limpio, exportarla: `postgres://event_promotion:dev_local_password@localhost:5432/event_promotion` (dev) o `.../event_promotion_test` (tests). Sin ella, todo endpoint con DB responde `500 "Error interno"` (`SASL: client password must be a string` en el log).
- Después de reiniciar, probar un endpoint con DB (p. ej. `POST /admin/auth/login`), no solo `/health` — `/health` da 200 aunque la DB esté mal configurada.
- `tsx watch` no relee el `.env`: reiniciar el proceso tras cambiar `RESEND_*`.
- Antes de decir "entorno listo", verificar de verdad con un request que use la DB.
