import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "out");
const targetDir = path.join(__dirname, "..", "..", "public", "registro-v2");

if (!existsSync(outDir)) {
  console.error("No se encontró frontend/out. Ejecutá npm run build en frontend/ primero.");
  process.exit(1);
}

if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true });
}

mkdirSync(path.dirname(targetDir), { recursive: true });
cpSync(outDir, targetDir, { recursive: true });
console.log(`✓ Copiado a ${targetDir}`);
