import "dotenv/config";
import app from "./app";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Vista móvil (vecino): http://localhost:${PORT}/`);
  console.log(`Registro dueño: http://localhost:${PORT}/registro.html`);
  console.log(`Alta cuenta: http://localhost:${PORT}/cuenta.html`);
  console.log(`War Room dueño: http://localhost:${PORT}/dashboard.html`);
});
