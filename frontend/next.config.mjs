/** @type {import('next').NextConfig} */

import path from "node:path";

import { fileURLToPath } from "node:url";



const nextConfig = {

  output: "export",

  trailingSlash: true,

  images: { unoptimized: true },

  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),

};



export default nextConfig;

