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

class PostgresDatabase implements Database {
  readonly kind = "postgres" as const;

  constructor(
    private readonly client: PostgresClient,
    private readonly schema: string | null,
  ) {}

  async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
    if (!this.schema) return new PostgresQueryable(this.client).query<T>(text, params);
    // Base partagée : chaque requête passe par une transaction qui fixe le schéma de MOODZ.
    // Compatible avec le pooler en mode transaction, où l'état de session n'est pas conservé.
    return this.transaction((tx) => tx.query<T>(text, params));
  }

  async transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R> {
    const result = await this.client.begin(async (tx) => {
      if (this.schema) await tx.unsafe(`select set_config('search_path', $1, true)`, [this.schema]);
      return fn(new PostgresQueryable(tx));
    });
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

/** Adresse de la base : DATABASE_URL, sinon POSTGRES_URL (ajoutée par l'intégration Vercel–Supabase). */
function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || undefined;
}

/** Schéma dédié à MOODZ quand la base est partagée avec d'autres sites (DATABASE_SCHEMA). */
function getSchema(): string | null {
  const schema = process.env.DATABASE_SCHEMA?.trim();
  if (!schema) return null;
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
    throw new Error("DATABASE_SCHEMA invalide : lettres minuscules, chiffres et _ uniquement (ex. moodz).");
  }
  return schema;
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

async function createPostgres(rawUrl: string, schema: string | null): Promise<Database> {
  const { default: postgres } = await import("postgres");
  let url = rawUrl;
  let sslDisabled = process.env.DATABASE_SSL === "disable";
  try {
    const parsed = new URL(rawUrl);
    sslDisabled ||= parsed.searchParams.get("sslmode") === "disable" || isLocalHost(parsed.hostname);
    // Les paramètres ajoutés par les hébergeurs (supa, pgbouncer, sslmode...) ne sont pas des réglages
    // PostgreSQL : postgres.js les transmettrait tels quels au serveur à la connexion.
    parsed.search = "";
    url = parsed.toString();
  } catch {
    // Adresse non standard (plusieurs hôtes...) : transmise telle quelle.
  }
  const client = postgres(url, {
    // Compatible avec le pooler Supabase (mode transaction) : pas de requêtes préparées nommées.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: sslDisabled ? false : "require",
    onnotice: () => {},
  });
  if (schema) {
    // Vérification préalable : un rôle sans droit CREATE sur la base peut utiliser un schéma existant.
    const exists = async () =>
      (await client.unsafe(`select 1 from pg_namespace where nspname = $1`, [schema])).length > 0;
    if (!(await exists())) {
      try {
        await client.unsafe(`create schema if not exists "${schema}"`);
      } catch (error) {
        if (!(await exists())) throw error; // sinon créé au même instant par une autre instance
      }
    }
  }
  return new PostgresDatabase(client, schema);
}

async function createPGlite(schema: string | null): Promise<Database> {
  if (process.env.VERCEL) {
    throw new Error(
      "Base de données manquante sur Vercel (le système de fichiers n'y est pas persistant). " +
        "Reliez une base Supabase au projet (onglet Storage, qui ajoute POSTGRES_URL) ou définissez DATABASE_URL.",
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = await PGlite.create(dir);
  // Une seule session : le schéma choisi reste actif pour toutes les requêtes.
  if (schema) await client.exec(`create schema if not exists "${schema}"; set search_path to "${schema}";`);
  return new PGliteDatabase(client);
}

async function init(): Promise<Database> {
  const url = getDatabaseUrl();
  const schema = getSchema();
  const db = url ? await createPostgres(url, schema) : await createPGlite(schema);
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
