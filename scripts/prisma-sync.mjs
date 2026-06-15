import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const prismaCache = resolve(root, "node_modules", ".prisma");

if (existsSync(prismaCache)) {
  rmSync(prismaCache, { recursive: true, force: true });
  console.log("✓ Caché node_modules/.prisma eliminada");
}

execSync("npx prisma generate", { cwd: root, stdio: "inherit" });
console.log("✓ Cliente Prisma regenerado desde prisma/schema.prisma");
