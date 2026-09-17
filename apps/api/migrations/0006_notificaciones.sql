-- Notificaciones con seguimiento de entrega (ADR-024). idconfirmacion nullable —
-- solo existe para tipo distinto de 'invitacion' (todavía no hay confirmación en ese caso).
CREATE TABLE notificaciones (
  idnotificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idinvitacion UUID NOT NULL REFERENCES invitaciones (idinvitacion),
  idconfirmacion UUID REFERENCES confirmaciones (idconfirmacion),
  tipo TEXT NOT NULL CHECK (
    tipo IN ('invitacion', 'confirmacion', 'edicion', 'cancelacion', 'reconfirmacion')
  ),
  estado_envio TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado_envio IN ('pendiente', 'enviado', 'fallido', 'rebotado')
  ),
  id_mensaje_resend TEXT,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (tipo = 'invitacion' OR idconfirmacion IS NOT NULL)
);
