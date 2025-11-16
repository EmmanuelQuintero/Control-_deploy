import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// Se recomienda usar un pool para reusar conexiones
let connectionPromise: Promise<mysql.Connection> | null = null;

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = mysql.createConnection(process.env.DATABASE_URL as string);
  }
  return connectionPromise;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Exportar una instancia lista para usar (promesa resuelta externamente en uso real)
export const dbPromise = getConnection().then(conn => drizzle(conn, { schema, mode: 'default' }));
export type DBType = Awaited<typeof dbPromise>;

// Helper para obtener db (await importado donde se use)
export async function getDb() {
  return dbPromise;
}
