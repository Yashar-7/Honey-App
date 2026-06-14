/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
  assetPrefix: process.env.NODE_ENV === "production" ? "/registro-v2" : undefined,
  basePath: process.env.NODE_ENV === "production" ? "/registro-v2" : undefined,
};

export default nextConfig;
