/**
 * Exporte les migrations de l'application en un fichier SQL pour Supabase
 * (éditeur SQL, CLI `supabase db push` ou outil MCP apply_migration).
 * Usage : npx tsx scripts/export-sql.ts
 */
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "../src/lib/db/migrations";

const header = `-- MOODZ : schéma de la base de données (généré par scripts/export-sql.ts, ne pas modifier à la main)
-- L'application applique aussi ces migrations automatiquement au démarrage.

create table if not exists _migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
alter table _migrations enable row level security;
`;

const body = MIGRATIONS.map(
  (m) => `\n-- ${m.id}\n${m.sql.trim()}\n\ninsert into _migrations (id) values ('${m.id}') on conflict (id) do nothing;\n`,
).join("");

const target = path.join(process.cwd(), "supabase/migrations/20260929000000_moodz_init.sql");
fs.writeFileSync(target, header + body);
console.log(`SQL exporté : ${target}`);
