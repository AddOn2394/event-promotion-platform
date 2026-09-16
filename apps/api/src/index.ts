import express from "express";
import { ConfirmarAsistenciaRequestSchema } from "@event-promotion/shared-types";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Feria de Promociones API — en construcción (ver spec/PLAN_DESARROLLO.md, Gate 1)");
});

// Placeholder de Gate 0: solo prueba que el contrato compartido valida en el límite de la API.
// El endpoint real (motor de descuento, persistencia, cupo) es Gate 2/Gate 3.
app.post("/confirmaciones", (req, res) => {
  const result = ConfirmarAsistenciaRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  res.status(501).json({ error: "No implementado todavía (Gate 2)" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "JSON inválido" });
    return;
  }
  next(err);
});

app.listen(port, () => {
  console.log(`apps/api escuchando en el puerto ${port}`);
});
