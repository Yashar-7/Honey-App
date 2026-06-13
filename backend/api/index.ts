/**
 * Entry point serverless para Vercel.
 * Exporta la app Express compilada (single entrypoint).
 */
import "dotenv/config";
import app from "../dist/app";

export default app;
