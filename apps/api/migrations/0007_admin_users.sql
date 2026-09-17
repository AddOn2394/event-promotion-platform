-- Cuenta admin seed (ADR-013) — sin registro público, un solo usuario por migración/seed.
CREATE TABLE admin_users (
  idusuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
