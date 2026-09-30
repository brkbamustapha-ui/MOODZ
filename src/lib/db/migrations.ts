import type { Database } from "./index";

/**
 * Migrations SQL, appliquées dans l'ordre au démarrage (idempotentes).
 * Le même SQL est exporté dans supabase/migrations pour un déploiement manuel.
 */
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_init",
    sql: `
create table if not exists settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id serial primary key,
  name text not null,
  description text not null default '',
  icon text not null default 'fork-knife',
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists menu_items (
  id serial primary key,
  category_id integer not null references categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  cost integer check (cost is null or cost >= 0),
  variants jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  is_available boolean not null default true,
  is_visible boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_items_category_idx on menu_items (category_id, position);

create table if not exists orders (
  id serial primary key,
  code text not null unique,
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','completed','rejected','cancelled')),
  order_type text not null check (order_type in ('pickup','delivery','dine_in')),
  customer_name text not null,
  customer_phone text not null,
  address text,
  table_number text,
  notes text,
  scheduled_for text,
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  eta_minutes integer,
  reject_reason text,
  client_hash text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_status_idx on orders (status, created_at desc);

create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  item_id integer references menu_items(id) on delete set null,
  category_name text not null default '',
  name text not null,
  variant text,
  unit_price integer not null check (unit_price >= 0),
  unit_cost integer,
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0)
);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_item_idx on order_items (item_id);

create table if not exists admins (
  id serial primary key,
  username text not null unique,
  password_hash text not null,
  session_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- Sécurité Supabase : aucune table n'est exposée via l'API publique (clé anon).
-- Le serveur Next.js se connecte avec un rôle propriétaire qui n'est pas soumis au RLS.
alter table settings enable row level security;
alter table app_secrets enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admins enable row level security;
alter table rate_limits enable row level security;
`,
  },
  {
    // Avec postgres.js, un paramètre `$1::jsonb` reçu sous forme de texte JSON était ré-encodé :
    // la colonne contenait une chaîne JSON au lieu d'un objet. On remet ces valeurs à plat.
    id: "002_jsonb_normalize",
    sql: `
update settings set data = (data #>> '{}')::jsonb where jsonb_typeof(data) = 'string';
update menu_items set variants = (variants #>> '{}')::jsonb where jsonb_typeof(variants) = 'string';
update menu_items set tags = (tags #>> '{}')::jsonb where jsonb_typeof(tags) = 'string';
`,
  },
  {
    // Le thème suit désormais le logo : l'or proposé par défaut devient l'olive du badge MOODZ.
    // Un accent choisi par le gérant (autre que cet or) est conservé.
    id: "003_accent_olive",
    sql: `
update settings set data = jsonb_set(data, '{theme,accent}', '"#738C1F"'::jsonb)
where jsonb_typeof(data) = 'object' and upper(data #>> '{theme,accent}') = '#D8B46A';
`,
  },
];

export async function runMigrations(db: Database) {
  await db.query(`
    create table if not exists _migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  await db.query(`alter table _migrations enable row level security`);

  const applied = new Set(
    (await db.query<{ id: string }>(`select id from _migrations`)).map((row) => row.id),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    await db.transaction(async (tx) => {
      // Sérialise les migrations si plusieurs instances démarrent en même temps.
      await tx.query(`select pg_advisory_xact_lock(4242001)`);
      const again = await tx.query(`select 1 from _migrations where id = $1`, [migration.id]);
      if (again.length > 0) return;
      for (const statement of splitStatements(migration.sql)) {
        await tx.query(statement);
      }
      await tx.query(`insert into _migrations (id) values ($1)`, [migration.id]);
    });
  }
}

/** Découpe un script SQL simple (sans fonctions $$) en instructions individuelles. */
export function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}
