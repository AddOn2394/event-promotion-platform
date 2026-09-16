import express from "express";

const app = express();
const port = process.env.PORT ?? 3000;

app.get("/", (_req, res) => {
  res.send("Feria de Promociones API — en construcción (ver spec/PLAN_DESARROLLO.md, Gate 1)");
});

app.listen(port, () => {
  console.log(`apps/api escuchando en el puerto ${port}`);
});
