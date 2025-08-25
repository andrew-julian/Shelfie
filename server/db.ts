import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please configure your database connection in Vercel environment variables. See VERCEL_DEPLOYMENT.md for setup instructions.",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });