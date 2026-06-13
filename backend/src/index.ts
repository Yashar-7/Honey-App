import "dotenv/config";
import app from "./app";

// Solo ejecutamos app.listen si NO estamos en Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

// Exportamos la app para Vercel
export default app;