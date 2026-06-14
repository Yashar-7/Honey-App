import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "out");
const publicDir = path.join(__dirname, "..", "..", "public");

if (!existsSync(outDir)) {
  console.error("No se encontró frontend/out. Ejecutá npm run build en frontend/ primero.");
  process.exit(1);
}

function copyPath(from, to) {
  if (!existsSync(from)) return;
  if (existsSync(to)) {
    rmSync(to, { recursive: true, force: true });
  }
  cpSync(from, to, { recursive: true });
}

/** Copia el export estático de Next al directorio public/ de Express. */
for (const entry of readdirSync(outDir)) {
  const source = path.join(outDir, entry);
  const target = path.join(publicDir, entry);

  if (entry === "escaneo.html") continue;

  if (statSync(source).isDirectory()) {
    copyPath(source, target);
    continue;
  }

  cpSync(source, target);
}

console.log("✓ Export de Next copiado a public/ (landing, registro y assets _next)");
