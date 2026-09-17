-- Cupo atómico por slot (ADR-009, Gate 3). cupos_disponibles es la única autoridad de
-- cupo — toda escritura pasa por UPDATE ... WHERE cupos_disponibles > 0, nunca read-then-write.
ALTER TABLE slots ADD COLUMN cupos_disponibles INTEGER;

UPDATE slots SET cupos_disponibles = cupo_maximo;

ALTER TABLE slots ALTER COLUMN cupos_disponibles SET NOT NULL;
ALTER TABLE slots ADD CONSTRAINT slots_cupos_disponibles_check CHECK (cupos_disponibles >= 0);
