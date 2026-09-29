import "server-only";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";
import { seedDatabase } from "./seed";

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Database extends Queryable {
  readonly kind: "postgres" | "pglite";
  transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R>;
}

declare global {
  var __moodzDb: Promise<Database> | undefined;
}

type PostgresClient = import("postgres").Sql;
type PostgresTx = import("postgres").TransactionSql;

class PostgresQueryable implements Queryable {
  constructor(private readonly sql: PostgresClient | PostgresTx) {}

  async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
    const rows = await this.sql.unsafe(text, params as never[]);
    return rows as unknown as T[];
  }
}

class PostgresDatabase extends PostgresQueryable implements Database {
  readonly kind = "postgres" as const;

  constructor(private readonly client: PostgresClient) {
    super(client);
  }

  async transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R> {
    const result = await this.client.begin((tx) => fn(new PostgresQueryable(tx)));
    return result as R;
  }
}

type PGliteClient = import("@electric-sql/pglite").PGlite;
type PGliteTx = import("@electric-sql/pglite").Transaction;

class PGliteQueryable implements Queryable {
  constructor(private readonly client: PGliteClient | PGliteTx) {}

  async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.client.query(text, params);
    return res.rows as T[];
  }
}

class PGliteDatabase extends PGliteQueryable implements Database {
  readonly kind = "pglite" as const;

  constructor(private readonly db: PGliteClient) {
    super(db);
  }

  async transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R> {
    return this.db.transaction((tx) => fn(new PGliteQueryable(tx)));
  }
}

function isLocalHost(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

async function createPostgres(url: string): Promise<Database> {
  const { default: postgres } = await import("postgres");
  const sslDisabled = process.env.DATABASE_SSL === "disable" || url.includes("sslmode=disable") || isLocalHost(url);
  const client = postgres(url, {
    // Compatible avec le pooler Supabase (mode transaction) : pas de requêtes préparées nommées.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: sslDisabled ? false : "require",
    onnotice: () => {},
  });
  return new PostgresDatabase(client);
}

async function createPGlite(): Promise<Database> {
  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL est requis sur Vercel (le système de fichiers n'est pas persistant). " +
        "Ajoutez l'URL de connexion Supabase/PostgreSQL dans les variables d'environnement.",
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = await PGlite.create(dir);
  return new PGliteDatabase(client);
}

async function init(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();
  const db = url ? await createPostgres(url) : await createPGlite();
  await runMigrations(db);
  await seedDatabase(db);
  return db;
}

/** Connexion partagée (une seule par processus), migrée et initialisée au premier appel. */
export function getDb(): Promise<Database> {
  if (!globalThis.__moodzDb) {
    globalThis.__moodzDb = init().catch((error) => {
      globalThis.__moodzDb = undefined;
      throw error;
    });
  }
  return globalThis.__moodzDb;
}
