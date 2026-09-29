import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../site-config";
import type { Database } from "./index";

type SeedItem = {
  name: string;
  description?: string;
  price: number;
  cost?: number;
  variants?: { label: string; price: number }[];
  tags?: string[];
};

type SeedCategory = { name: string; description: string; icon: string; items: SeedItem[] };

/**
 * Carte d'exemple. Elle est chargée une seule fois, au premier démarrage,
 * et se modifie entièrement depuis le tableau de bord (Menu > Import rapide).
 */
export const SAMPLE_MENU: SeedCategory[] = [
  {
    name: "Cafés & boissons chaudes",
    description: "Torréfaction italienne, lait entier ou végétal.",
    icon: "coffee",
    items: [
      { name: "Espresso", description: "Serré, intense, crème noisette.", price: 150, cost: 35 },
      { name: "Double espresso", price: 250, cost: 60 },
      { name: "Café noisette", description: "Espresso et une touche de lait mousseux.", price: 180, cost: 45 },
      { name: "Cappuccino", description: "Espresso, lait velouté, cacao.", price: 280, cost: 70, tags: ["popular"] },
      { name: "Latte macchiato", price: 320, cost: 80 },
      { name: "Caramel latte", description: "Latte, sirop caramel beurre salé.", price: 380, cost: 95, tags: ["signature"] },
      { name: "Chocolat chaud", description: "Chocolat noir fondu, chantilly maison.", price: 320, cost: 90 },
      { name: "Thé à la menthe", description: "Menthe fraîche, servi à la théière.", price: 150, cost: 30 },
    ],
  },
  {
    name: "Boissons fraîches",
    description: "Pressées à la minute, servies bien fraîches.",
    icon: "orange-slice",
    items: [
      { name: "Jus d'orange pressé", price: 300, cost: 110, tags: ["popular"] },
      { name: "Citronnade maison", description: "Citron, menthe, eau pétillante.", price: 280, cost: 70 },
      { name: "Mojito virgin", description: "Citron vert, menthe, sucre de canne.", price: 450, cost: 120 },
      { name: "Smoothie fruits rouges", description: "Fraise, framboise, banane.", price: 480, cost: 160 },
      {
        name: "Milkshake",
        description: "Vanille, chocolat ou fraise.",
        price: 450,
        cost: 140,
        variants: [
          { label: "Vanille", price: 450 },
          { label: "Chocolat", price: 450 },
          { label: "Fraise", price: 450 },
        ],
      },
      { name: "Iced latte", price: 380, cost: 95, tags: ["new"] },
      { name: "Soda", description: "Au choix, 33 cl.", price: 150, cost: 70 },
      { name: "Eau minérale", description: "50 cl.", price: 80, cost: 30 },
    ],
  },
  {
    name: "Petit-déjeuner & brunch",
    description: "Servi jusqu'à 13 h.",
    icon: "egg",
    items: [
      {
        name: "Formule MOODZ",
        description: "Boisson chaude, jus pressé, viennoiserie, omelette et pain grillé.",
        price: 950,
        cost: 330,
        tags: ["signature"],
      },
      { name: "Omelette au fromage", description: "Trois œufs, emmental, salade.", price: 450, cost: 140 },
      { name: "Pancakes", description: "Sirop d'érable, fruits de saison.", price: 550, cost: 170, tags: ["popular"] },
      { name: "Avocado toast", description: "Pain de campagne, avocat, œuf poché.", price: 750, cost: 290 },
      { name: "Brunch royal", description: "Pour deux : salé, sucré, boissons chaudes et jus.", price: 2600, cost: 950 },
    ],
  },
  {
    name: "Crêpes & gaufres",
    description: "Pâte maison, garnitures généreuses.",
    icon: "cake",
    items: [
      { name: "Crêpe Nutella", price: 450, cost: 120 },
      { name: "Crêpe Nutella banane", price: 520, cost: 145, tags: ["popular"] },
      { name: "Gaufre chantilly", price: 400, cost: 110 },
      { name: "Crêpe poulet fromage", description: "Poulet émincé, sauce blanche, mozzarella.", price: 650, cost: 230 },
    ],
  },
  {
    name: "Salades",
    description: "Légumes du marché, sauces maison.",
    icon: "leaf",
    items: [
      { name: "César au poulet", description: "Romaine, poulet grillé, parmesan, croûtons.", price: 850, cost: 300, tags: ["popular"] },
      { name: "Niçoise", description: "Thon, œuf, olives, haricots verts.", price: 800, cost: 290 },
      { name: "Salade MOODZ", description: "Quinoa, avocat, feta, grenade, vinaigrette citron.", price: 950, cost: 340, tags: ["signature", "veggie"] },
      { name: "Chèvre chaud", description: "Toasts de chèvre, miel, noix.", price: 900, cost: 330, tags: ["veggie"] },
    ],
  },
  {
    name: "Sandwichs & croques",
    description: "Servis avec frites ou salade.",
    icon: "bread",
    items: [
      { name: "Croque-monsieur", description: "Jambon de dinde, béchamel, emmental gratiné.", price: 550, cost: 180, tags: ["popular"] },
      { name: "Croque-madame", description: "Le croque-monsieur et son œuf au plat.", price: 650, cost: 210 },
      { name: "Panini poulet", price: 650, cost: 220 },
      { name: "Club sandwich", description: "Poulet, œuf, tomate, salade, sauce cocktail.", price: 750, cost: 260 },
      { name: "Tacos poulet", description: "Galette grillée, frites, sauce fromagère.", price: 750, cost: 250, tags: ["spicy"] },
    ],
  },
  {
    name: "Burgers",
    description: "Pain brioché, viande hachée du jour, frites maison.",
    icon: "hamburger",
    items: [
      { name: "Classic burger", description: "Steak, cheddar, tomate, oignon, sauce maison.", price: 900, cost: 330 },
      { name: "Chicken crispy", description: "Poulet croustillant, coleslaw, sauce miel moutarde.", price: 950, cost: 340 },
      { name: "Burger MOODZ", description: "Double steak, cheddar affiné, oignons confits, sauce signature.", price: 1400, cost: 520, tags: ["signature"] },
      { name: "Spicy burger", description: "Steak, jalapeños, pepper jack, sauce harissa.", price: 1000, cost: 360, tags: ["spicy", "new"] },
    ],
  },
  {
    name: "Pizzas",
    description: "Pâte fine, cuisson au four.",
    icon: "pizza",
    items: [
      {
        name: "Margherita",
        description: "Tomate, mozzarella, basilic.",
        price: 800,
        cost: 230,
        variants: [
          { label: "Moyenne", price: 800 },
          { label: "Large", price: 1150 },
        ],
        tags: ["veggie"],
      },
      {
        name: "Reine",
        description: "Tomate, mozzarella, jambon de dinde, champignons.",
        price: 1000,
        cost: 300,
        variants: [
          { label: "Moyenne", price: 1000 },
          { label: "Large", price: 1400 },
        ],
      },
      {
        name: "Quatre fromages",
        description: "Mozzarella, cheddar, bleu, parmesan.",
        price: 1200,
        cost: 380,
        variants: [
          { label: "Moyenne", price: 1200 },
          { label: "Large", price: 1650 },
        ],
      },
      {
        name: "Pizza MOODZ",
        description: "Crème, poulet fumé, champignons, oignons caramélisés.",
        price: 1400,
        cost: 440,
        variants: [
          { label: "Moyenne", price: 1400 },
          { label: "Large", price: 1900 },
        ],
        tags: ["signature"],
      },
    ],
  },
  {
    name: "Pâtes & plats",
    description: "Cuisinés à la commande.",
    icon: "bowl-steam",
    items: [
      { name: "Pâtes Alfredo au poulet", description: "Crème, parmesan, poulet grillé.", price: 1100, cost: 360, tags: ["popular"] },
      { name: "Penne arrabbiata", description: "Sauce tomate relevée, basilic.", price: 900, cost: 250, tags: ["spicy", "veggie"] },
      { name: "Escalope panée", description: "Frites maison, salade, sauce au choix.", price: 1200, cost: 420 },
      { name: "Émincé de poulet à la crème", description: "Riz basmati, champignons.", price: 1300, cost: 450 },
      { name: "Entrecôte grillée", description: "Environ 250 g, frites, sauce poivre.", price: 2600, cost: 1250 },
    ],
  },
  {
    name: "Desserts",
    description: "Faits maison, chaque jour.",
    icon: "ice-cream",
    items: [
      { name: "Tiramisu", price: 550, cost: 160, tags: ["popular"] },
      { name: "Fondant au chocolat", description: "Cœur coulant, boule vanille.", price: 550, cost: 170, tags: ["signature"] },
      { name: "Cheesecake", description: "Coulis fruits rouges.", price: 600, cost: 190 },
      { name: "Coupe glacée", description: "Trois boules, chantilly, amandes.", price: 500, cost: 150 },
      { name: "Tarte du jour", price: 450, cost: 130 },
    ],
  },
];

async function isDone(db: Database, id: string) {
  const rows = await db.query(`select 1 from _migrations where id = $1`, [id]);
  return rows.length > 0;
}

export async function insertMenu(db: Pick<Database, "query">, menu: SeedCategory[], startPosition = 0) {
  let categoryPosition = startPosition;
  for (const category of menu) {
    const [row] = await db.query<{ id: number }>(
      `insert into categories (name, description, icon, position) values ($1, $2, $3, $4) returning id`,
      [category.name, category.description, category.icon, categoryPosition++],
    );
    let itemPosition = 0;
    for (const item of category.items) {
      await db.query(
        `insert into menu_items (category_id, name, description, price, cost, variants, tags, position)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
        [
          row.id,
          item.name,
          item.description ?? "",
          item.price,
          item.cost ?? null,
          JSON.stringify(item.variants ?? []),
          JSON.stringify(item.tags ?? []),
          itemPosition++,
        ],
      );
    }
  }
}

export async function seedDatabase(db: Database) {
  // Paramètres du site
  await db.query(
    `insert into settings (id, data) values (1, $1::jsonb) on conflict (id) do nothing`,
    [JSON.stringify(DEFAULT_SETTINGS)],
  );

  // Carte d'exemple, une seule fois
  if (!(await isDone(db, "seed_menu_v1"))) {
    await db.transaction(async (tx) => {
      await tx.query(`select pg_advisory_xact_lock(4242002)`);
      const again = await tx.query(`select 1 from _migrations where id = 'seed_menu_v1'`);
      if (again.length > 0) return;
      const [{ count }] = await tx.query<{ count: number }>(`select count(*)::int as count from categories`);
      if (count === 0) await insertMenu(tx, SAMPLE_MENU);
      await tx.query(`insert into _migrations (id) values ('seed_menu_v1')`);
    });
  }

  // Compte administrateur initial
  const [{ count: admins }] = await db.query<{ count: number }>(`select count(*)::int as count from admins`);
  if (admins === 0) {
    const username = (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase();
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[MOODZ] Aucun administrateur : définissez ADMIN_USERNAME et ADMIN_PASSWORD puis redémarrez.",
        );
        return;
      }
      password = "moodz2026";
      console.warn(`[MOODZ] Compte de développement créé : ${username} / ${password} (à changer).`);
    }
    const hash = await bcrypt.hash(password, 11);
    await db.query(
      `insert into admins (username, password_hash) values ($1, $2) on conflict (username) do nothing`,
      [username, hash],
    );
  }
}
