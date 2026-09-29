import "server-only";
import { getDb, type Queryable } from "../db";
import type { Category, MenuItem, PublicCategory, Variant } from "../types";

type CategoryRow = {
  id: number;
  name: string;
  description: string;
  icon: string;
  position: number;
  is_visible: boolean;
};

type ItemRow = {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  variants: unknown;
  tags: unknown;
  is_available: boolean;
  is_visible: boolean;
  position: number;
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export function mapItem(row: ItemRow): MenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: row.price,
    cost: row.cost,
    variants: parseJson<Variant[]>(row.variants, []),
    tags: parseJson<string[]>(row.tags, []),
    isAvailable: row.is_available,
    isVisible: row.is_visible,
    position: row.position,
  };
}

function mapCategory(row: CategoryRow, items: MenuItem[]): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    position: row.position,
    isVisible: row.is_visible,
    items,
  };
}

const ITEM_COLUMNS = `id, category_id, name, description, price, cost, variants, tags, is_available, is_visible, position`;

export async function getAdminMenu(): Promise<Category[]> {
  const db = await getDb();
  const categories = await db.query<CategoryRow>(
    `select id, name, description, icon, position, is_visible from categories order by position, id`,
  );
  const items = (await db.query<ItemRow>(`select ${ITEM_COLUMNS} from menu_items order by position, id`)).map(mapItem);
  return categories.map((c) => mapCategory(c, items.filter((i) => i.categoryId === c.id)));
}

export async function getPublicMenu(): Promise<PublicCategory[]> {
  const menu = await getAdminMenu();
  return menu
    .filter((c) => c.isVisible)
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      items: c.items
        .filter((i) => i.isVisible)
        .map((i) => ({
          id: i.id,
          categoryId: i.categoryId,
          name: i.name,
          description: i.description,
          price: i.price,
          variants: i.variants,
          tags: i.tags,
          isAvailable: i.isAvailable,
        })),
    }))
    .filter((c) => c.items.length > 0);
}

/* ------------------------------------------------------------------ */
/* Catégories                                                          */
/* ------------------------------------------------------------------ */

export type CategoryInput = {
  name: string;
  description: string;
  icon: string;
  isVisible: boolean;
};

export async function createCategory(input: CategoryInput): Promise<number> {
  const db = await getDb();
  const [row] = await db.query<{ id: number }>(
    `insert into categories (name, description, icon, is_visible, position)
     values ($1, $2, $3, $4, coalesce((select max(position) + 1 from categories), 0))
     returning id`,
    [input.name, input.description, input.icon, input.isVisible],
  );
  return row.id;
}

export async function updateCategory(id: number, input: Partial<CategoryInput>): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(
    `update categories set
       name = coalesce($2, name),
       description = coalesce($3, description),
       icon = coalesce($4, icon),
       is_visible = coalesce($5, is_visible),
       updated_at = now()
     where id = $1 returning id`,
    [id, input.name ?? null, input.description ?? null, input.icon ?? null, input.isVisible ?? null],
  );
  return rows.length > 0;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(`delete from categories where id = $1 returning id`, [id]);
  return rows.length > 0;
}

export async function reorderCategories(ids: number[]): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx.query(`update categories set position = $2, updated_at = now() where id = $1`, [id, position]);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export type ItemInput = {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  variants: Variant[];
  tags: string[];
  isAvailable: boolean;
  isVisible: boolean;
};

export async function createItem(input: ItemInput): Promise<MenuItem> {
  const db = await getDb();
  const [row] = await db.query<ItemRow>(
    `insert into menu_items (category_id, name, description, price, cost, variants, tags, is_available, is_visible, position)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9,
       coalesce((select max(position) + 1 from menu_items where category_id = $1), 0))
     returning ${ITEM_COLUMNS}`,
    [
      input.categoryId,
      input.name,
      input.description,
      input.price,
      input.cost,
      JSON.stringify(input.variants),
      JSON.stringify(input.tags),
      input.isAvailable,
      input.isVisible,
    ],
  );
  return mapItem(row);
}

export async function updateItem(id: number, input: Partial<ItemInput>): Promise<MenuItem | null> {
  const db = await getDb();
  const [row] = await db.query<ItemRow>(
    `update menu_items set
       category_id = coalesce($2, category_id),
       name = coalesce($3, name),
       description = coalesce($4, description),
       price = coalesce($5, price),
       cost = case when $6::boolean then $7::integer else cost end,
       variants = coalesce($8::jsonb, variants),
       tags = coalesce($9::jsonb, tags),
       is_available = coalesce($10, is_available),
       is_visible = coalesce($11, is_visible),
       updated_at = now()
     where id = $1
     returning ${ITEM_COLUMNS}`,
    [
      id,
      input.categoryId ?? null,
      input.name ?? null,
      input.description ?? null,
      input.price ?? null,
      input.cost !== undefined,
      input.cost ?? null,
      input.variants ? JSON.stringify(input.variants) : null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.isAvailable ?? null,
      input.isVisible ?? null,
    ],
  );
  return row ? mapItem(row) : null;
}

export async function deleteItem(id: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(`delete from menu_items where id = $1 returning id`, [id]);
  return rows.length > 0;
}

export async function reorderItems(categoryId: number, ids: number[]): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx.query(
        `update menu_items set position = $3, updated_at = now() where id = $1 and category_id = $2`,
        [id, categoryId, position],
      );
    }
  });
}

/* ------------------------------------------------------------------ */
/* Import rapide                                                       */
/* ------------------------------------------------------------------ */

export type ImportedCategory = {
  name: string;
  items: { name: string; description: string; price: number; variants: Variant[] }[];
};

export async function importMenu(categories: ImportedCategory[], mode: "append" | "replace"): Promise<{
  categories: number;
  items: number;
}> {
  const db = await getDb();
  let itemCount = 0;
  await db.transaction(async (tx) => {
    if (mode === "replace") {
      await tx.query(`delete from categories`);
    }
    const [{ next }] = await tx.query<{ next: number }>(
      `select coalesce(max(position) + 1, 0)::int as next from categories`,
    );
    let position = next;
    for (const category of categories) {
      const [row] = await tx.query<{ id: number }>(
        `insert into categories (name, description, icon, position) values ($1, '', $2, $3) returning id`,
        [category.name, guessIcon(category.name), position++],
      );
      for (const [index, item] of category.items.entries()) {
        await tx.query(
          `insert into menu_items (category_id, name, description, price, variants, position)
           values ($1, $2, $3, $4, $5::jsonb, $6)`,
          [row.id, item.name, item.description, item.price, JSON.stringify(item.variants), index],
        );
        itemCount++;
      }
    }
    if (mode === "replace") await markMenuEdited(tx);
  });
  return { categories: categories.length, items: itemCount };
}

const ICON_HINTS: [RegExp, string][] = [
  [/caf|espresso|chaud|th[ée]/i, "coffee"],
  [/jus|frais|boisson|smoothie|milk|soda|mojito|cocktail/i, "orange-slice"],
  [/petit|brunch|d[ée]jeuner|omelette|oeuf|œuf/i, "egg"],
  [/cr[êe]pe|gaufre|g[âa]teau|p[âa]tisserie/i, "cake"],
  [/salade|veg|healthy/i, "leaf"],
  [/sandwich|croque|panini|tacos|wrap/i, "bread"],
  [/burger/i, "hamburger"],
  [/pizza/i, "pizza"],
  [/p[âa]tes|plat|grill|viande|poulet/i, "bowl-steam"],
  [/poisson|fruits de mer/i, "fish"],
  [/dessert|glace|sucr/i, "ice-cream"],
];

export function guessIcon(name: string): string {
  return ICON_HINTS.find(([re]) => re.test(name))?.[1] ?? "fork-knife";
}

/** La carte d'exemple a été remplacée : on masque le rappel dans le tableau de bord. */
async function markMenuEdited(db: Queryable) {
  await db.query(
    `update settings set data = jsonb_set(data, '{menuIsSample}', 'false'::jsonb), updated_at = now()
     where id = 1 and coalesce(data->>'menuIsSample', 'true') = 'true'`,
  );
}
