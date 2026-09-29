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
 * Carte de MOODZ (menu Canva, septembre 2026). Chargée une seule fois, au premier démarrage,
 * puis modifiable entièrement depuis le tableau de bord (Carte).
 */
export const INITIAL_MENU: SeedCategory[] = [
  {
    name: "Entrées",
    description: "Camembert pané, salades et gratins.",
    icon: "leaf",
    items: [
      { name: "Camembert pané", description: "Servi avec du miel ou une sauce chili thaï.", price: 300, variants: [{ label: "2 pièces", price: 300 }, { label: "4 pièces", price: 550 }, { label: "6 pièces", price: 750 }] },
      { name: "Salade algérienne", price: 500 },
      { name: "Macédoine", price: 450 },
      { name: "Salade César", price: 750 },
      { name: "Salade au thon", price: 750 },
      { name: "Gratin au poulet", price: 650 },
      { name: "Gratin à la viande hachée", price: 700 },
      { name: "Gratin au fromage", price: 650 },
      { name: "Gratin aux crevettes", price: 950 },
    ],
  },
  {
    name: "Pastas",
    description: "",
    icon: "bowl-steam",
    items: [
      { name: "Tagliatelles Alfredo", description: "Crémeuses, pleines de saveur : poulet tendre et champignons à la perfection.", price: 850 },
      { name: "Penne 4 fromages", description: "Cheesy mood garanti : cheddar, gruyère, gouda et mozza fondue.", price: 850 },
      { name: "Spaghettis bolognaise", description: "Un grand classique façon MOODZ : sauce bolognaise maison et viande hachée.", price: 850 },
      { name: "Penne crispy", description: "Sauce blanche onctueuse et poulet pané croustillant, le combo parfait.", price: 950 },
      { name: "Spaghettis aux fruits de mer", description: "Une touche marine : sauce tomate relevée et fruits de mer frais.", price: 1200 },
      { name: "Tagliatelles aux crevettes", description: "Sauce blanche douce et crevettes fraîches, simples et irrésistibles.", price: 1200 },
    ],
  },
  {
    name: "Sandwichs",
    description: "Pain artisanal.",
    icon: "bread",
    items: [
      { name: "Le Gourmand", description: "Viande hachée, rôti de poulet fumé, sauce fromagère, œuf, gruyère, crudités.", price: 700 },
      { name: "Le Radical", description: "Viande hachée, crispy tenders, gruyère, sauce cheddar, sauce algérienne.", price: 700 },
      { name: "Chicken Tandoori", description: "Poulet tandoori, gruyère, crudités.", price: 600 },
      { name: "Chicken Curry", description: "Poulet au curry, sauce fromagère, gruyère, crudités.", price: 600 },
      { name: "Le Phénomène", description: "Blanc de poulet grillé, champignons frais, sauce fromagère, gruyère, crudités.", price: 600 },
      { name: "Le Big Mood", description: "Viande hachée doublée, rôti fumé grillé, mozzarella panée, crudités, sauce maison.", price: 800, tags: ["signature"] },
      { name: "Le Carnivore", description: "Viande hachée, poulet haché, merguez, sauce fromagère, sauce tartare, gruyère, slice.", price: 700 },
      { name: "L'Américain", description: "Crispy tenders, gruyère, sauce cheddar, sauce BBQ, crudités.", price: 600 },
      { name: "3 Fromages", description: "Poulet, gruyère, gouda, camembert.", price: 650 },
      { name: "Le Suprême", description: "Double viande, fromage fumé, oignons caramélisés, œuf, sauce algérienne, crudités.", price: 750 },
      { name: "Le Mexicain", description: "Poulet mariné, poivron, oignon caramélisé, maïs, sauce piquante, gruyère, crudités.", price: 600, tags: ["spicy"] },
      { name: "Le Mix", description: "Poulet mariné, viande hachée, sauce fromagère, sauce à l'ail, gruyère, crudités.", price: 700 },
      { name: "Le Fish", description: "Crevettes, blanc de poulet, sauce cheddar, gruyère, crudités.", price: 850 },
      { name: "Classic Viande", description: "Viande hachée, frites, œuf, crudités.", price: 500 },
      { name: "Chick'n Fresh", description: "Poulet, frites, œuf, crudités.", price: 400 },
      { name: "Marinado", description: "Poulet mariné, frites, crudités.", price: 400 },
    ],
  },
  {
    name: "Burgers",
    description: "En simple ou en double.",
    icon: "hamburger",
    items: [
      { name: "Original Burger", description: "Viande fraîche, crudités, gruyère, sauce burger.", price: 500, variants: [{ label: "Simple", price: 500 }, { label: "Double", price: 700 }] },
      { name: "Chicken Burger", description: "Poulet haché, gruyère, crudités, sauce burger.", price: 450, variants: [{ label: "Simple", price: 450 }, { label: "Double", price: 650 }] },
      { name: "Honey Burger", description: "Viande hachée, oignons caramélisés, camembert et miel, gruyère, crudités.", price: 750, variants: [{ label: "Simple", price: 750 }, { label: "Double", price: 950 }], tags: ["signature"] },
      { name: "Crunchy Burger", description: "Crispy, sauce burger, onion rings, gruyère, crudités, sauce BBQ.", price: 600, variants: [{ label: "Simple", price: 600 }, { label: "Double", price: 800 }] },
      { name: "Blue Burger", description: "Viande hachée, crudités, sauce roquefort, cornichon, gruyère.", price: 750, variants: [{ label: "Simple", price: 750 }, { label: "Double", price: 950 }] },
      { name: "The Forest", description: "Viande hachée, oignons caramélisés, champignons frais, cornichon, gruyère, crudités.", price: 650, variants: [{ label: "Simple", price: 650 }, { label: "Double", price: 850 }] },
      { name: "American Burger", description: "Double viande hachée, rôti de poulet fumé, sauce américaine, œuf, onion rings, cornichon, gruyère.", price: 900 },
      { name: "Black Burger", description: "Double viande hachée, mozzarella panée, oignon caramélisé, crudités.", price: 950 },
    ],
  },
  {
    name: "Tacos",
    description: "",
    icon: "pepper",
    items: [
      { name: "Le Swiss", description: "Poulet, boursin, sauce gruyère, frites.", price: 750 },
      { name: "Chèvre Miel", description: "Poulet, fromage de chèvre, miel, sauce cheddar, frites.", price: 750 },
      { name: "Chicken Cheesy Curry", description: "Crispy, gouda, sauce fromagère, sauce curry, frites.", price: 700 },
      { name: "Montagnard", description: "Gratiné au fromage fumé et au camembert, steak haché, sauce roquefort.", price: 850 },
      { name: "Le Fameux", description: "Gratiné au pepperoni et au fromage fumé, steak haché, sauce fromagère, frites.", price: 850 },
      { name: "L'Indien", description: "Gratiné au hot-dog, poulet mariné au curry, mozzarella, sauce fromagère, frites.", price: 850 },
      { name: "Le Monstre", description: "3 viandes, fromage, gratiné au fromage fumé, sauce fromagère, frites, sauce au choix.", price: 950, tags: ["signature"] },
      { name: "Tacos M", description: "1 tortilla, 1 viande au choix, sauce fromagère, fourré aux frites.", price: 650 },
      { name: "Tacos L", description: "1 tortilla, 2 viandes au choix, sauce fromagère, frites.", price: 850 },
      { name: "Tacos Maxi", description: "2 tortillas, 3 viandes au choix, sauce fromagère, frites.", price: 1300 },
    ],
  },
  {
    name: "Pizzas classiques",
    description: "Base tomate.",
    icon: "pizza",
    items: [
      { name: "Marguerita", description: "Sauce tomate, cheddar, mozzarella, olive, basilic.", price: 450 },
      { name: "Flame'Z", description: "Sauce tomate, merguez, cheddar, gruyère, olive, basilic.", price: 600 },
      { name: "Meat Lover", description: "Sauce tomate, viande hachée, cheddar, mozzarella, gruyère, olive, basilic.", price: 700 },
      { name: "3 Fromages", description: "Sauce tomate, cheddar, mozzarella, camembert, olive, basilic.", price: 650 },
      { name: "Forest", description: "Sauce tomate, champignons frais, mozzarella, cheddar, olive, basilic.", price: 800 },
      { name: "Veggie", description: "Sauce tomate, cheddar, mozzarella, champignons frais, maïs, tomate fraîche, oignon, poivron, olive, basilic, tomates cerises.", price: 700, tags: ["veggie"] },
      { name: "Smoky", description: "Sauce tomate, cheddar, mozzarella, gruyère, rôti de poulet fumé, fromage fumé, olive, basilic.", price: 800 },
      { name: "Pep'Z", description: "Sauce tomate, pepperoni, fromage fumé, mozzarella, cheddar, olive, basilic.", price: 800 },
      { name: "Tuna", description: "Sauce tomate, thon, cheddar, gruyère, mozzarella, olive, basilic.", price: 750 },
      { name: "Chicken'Z", description: "Sauce tomate, blanc de poulet, mozzarella, cheddar, gruyère, olive.", price: 800 },
      { name: "Kebab'Z", description: "Sauce tomate, kebab, mozzarella, cheddar, gruyère, olive, basilic.", price: 850 },
    ],
  },
  {
    name: "Pizzas base tomate",
    description: "En M, XL ou XXL.",
    icon: "pizza",
    items: [
      { name: "Texan", description: "Sauce tomate, viande hachée, champignons frais, cheddar, mozzarella, olive, basilic.", price: 900, variants: [{ label: "M", price: 900 }, { label: "XL", price: 1700 }, { label: "XXL", price: 2600 }] },
      { name: "Oriental", description: "Sauce tomate, kebab, merguez, champignons, mozzarella, cheddar, gruyère, olive.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2700 }] },
      { name: "Seasonz", description: "Sauce tomate, viande hachée, poulet haché, thon, cheddar, mozzarella, gruyère, olive.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2600 }] },
      { name: "Futura", description: "Sauce tomate, cheddar, mozzarella, poivrons, gruyère, kebab, viande hachée, oignons, maïs, olive.", price: 1000, variants: [{ label: "M", price: 1000 }, { label: "XL", price: 1850 }, { label: "XXL", price: 2800 }] },
      { name: "Moodz-Up", description: "Sauce tomate, viande hachée, rôti de poulet fumé, thon, fromage fumé, cheddar, mozzarella, olive.", price: 1000, variants: [{ label: "M", price: 1000 }, { label: "XL", price: 1850 }, { label: "XXL", price: 2800 }], tags: ["signature"] },
      { name: "Mexican", description: "Sauce tomate, piment, viande hachée, merguez, hot-dog, œuf, poivron, cheddar, mozzarella, gruyère, olive.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2700 }], tags: ["spicy"] },
      { name: "Carnivorous", description: "Sauce tomate, mozzarella, viande hachée, kebab, poulet fumé, cheddar, gruyère, olive.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2700 }] },
      { name: "5 Fromages", description: "Sauce tomate, cheddar, gouda, mozzarella, camembert, gruyère, olive, basilic, tomates cerises.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2700 }] },
      { name: "Ocean", description: "Sauce tomate, crevettes fraîches, mozzarella, cheddar, gruyère, olive, tomates cerises.", price: 1500 },
      { name: "Mystery", description: "Surprise de la maison.", price: 1350, variants: [{ label: "M", price: 1350 }, { label: "XL", price: 2600 }, { label: "XXL", price: 3500 }] },
    ],
  },
  {
    name: "Pizzas base crème",
    description: "En M, XL ou XXL.",
    icon: "pizza",
    items: [
      { name: "White Chicken", description: "Sauce blanche, cheddar, mozzarella, gruyère, poulet, olive, basilic.", price: 850 },
      { name: "Alfredo", description: "Sauce blanche, cheddar, mozzarella, jambon de poulet, champignons frais, gruyère, olive, basilic.", price: 1000, variants: [{ label: "M", price: 1000 }, { label: "XL", price: 1850 }, { label: "XXL", price: 2800 }] },
      { name: "Turkish", description: "Sauce blanche, cheddar, mozzarella, poulet, viande hachée, olive, basilic, gruyère.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2700 }] },
      { name: "Boisée", description: "Sauce blanche, cheddar, mozzarella, poulet, fromage fumé, jambon de dinde fumé, olive, basilic.", price: 950, variants: [{ label: "M", price: 950 }, { label: "XL", price: 1800 }, { label: "XXL", price: 2700 }] },
      { name: "Blue-Cheese", description: "Sauce blanche, gruyère, bleu roquefort, mozzarella, camembert, olive, basilic, tomates cerises.", price: 1000, variants: [{ label: "M", price: 1000 }, { label: "XL", price: 1850 }, { label: "XXL", price: 2800 }] },
      { name: "5 Fromages Bianca", description: "Sauce blanche, cheddar, camembert, edam, mozzarella, gruyère, olive, basilic.", price: 1000, variants: [{ label: "M", price: 1000 }, { label: "XL", price: 1850 }, { label: "XXL", price: 2800 }] },
      { name: "Sea Fruits", description: "Sauce blanche, gruyère, cheddar, crevettes, calamar, sépia, mozzarella, citron.", price: 1650 },
      { name: "Norwaygian", description: "Sauce blanche, cheddar, mozzarella, gruyère, saumon fumé, olives.", price: 1300 },
    ],
  },
  {
    name: "Plats",
    description: "Viandes blanches et viandes rouges.",
    icon: "fork-knife",
    items: [
      { name: "Blanc de poulet haché farci aux 3 fromages", price: 1250 },
      { name: "Escalope au fromage grillé", price: 1000 },
      { name: "Escalope panée", price: 1150 },
      { name: "Escalope au curry", price: 1250 },
      { name: "Émincé de poulet à la crème et aux champignons", price: 1200 },
      { name: "Cordon bleu", price: 1400 },
      { name: "Escalope tandoori", price: 1250 },
      { name: "Viande fourrée mozza", price: 1550 },
      { name: "Viande hachée grillée", price: 1100 },
      { name: "Viande farcie aux 3 fromages", price: 1350 },
      { name: "Steak de veau sauce poivre", price: 1400 },
      { name: "Entrecôte grillée à la plancha", price: 1400 },
      { name: "Merguez", price: 1250 },
      { name: "Foie de veau grillé", price: 1600 },
    ],
  },
  {
    name: "Petits snacks",
    description: "",
    icon: "bowl-food",
    items: [
      { name: "Tenders", price: 500, variants: [{ label: "4 pièces", price: 500 }, { label: "7 pièces", price: 800 }, { label: "10 pièces", price: 900 }] },
      { name: "Hot wings", price: 500, variants: [{ label: "4 pièces", price: 500 }, { label: "7 pièces", price: 800 }, { label: "10 pièces", price: 900 }], tags: ["spicy"] },
      { name: "The Hot Mix", description: "4 tenders et 4 hot wings.", price: 800 },
      { name: "Croque poulet", price: 400 },
      { name: "Croque viande", price: 450 },
      { name: "Croque au thon", price: 400 },
      { name: "Croque aux fromages", price: 450 },
      { name: "Bowl viande", price: 850 },
      { name: "Bowl crousty", price: 750 },
    ],
  },
  {
    name: "Menu Kids",
    description: "Boisson à paillettes et surprise incluses.",
    icon: "popsicle",
    items: [
      { name: "Menu Kids pizza", description: "Pizza mini, boisson à paillettes, surprise.", price: 500 },
      { name: "Menu Kids burger", description: "Burger, frites, boisson à paillettes, surprise.", price: 500 },
    ],
  },
  {
    name: "Suppléments",
    description: "À ajouter à votre commande.",
    icon: "sparkle",
    items: [
      { name: "Supplément fromage", price: 200 },
      { name: "Supplément viande", price: 200 },
      { name: "Frites", price: 150 },
      { name: "Frites au fromage", price: 250 },
      { name: "Supplément légumes", price: 100 },
      { name: "Supplément œuf", price: 50 },
      { name: "Gratinage simple", description: "Pour les tacos.", price: 150 },
      { name: "Gratinage fumé ou camembert", description: "Pour les tacos.", price: 250 },
    ],
  },
  {
    name: "Boissons",
    description: "",
    icon: "drop",
    items: [
      { name: "Eau minérale", price: 30, variants: [{ label: "0,5 L", price: 30 }, { label: "1,5 L", price: 50 }] },
      { name: "Soda", price: 100, variants: [{ label: "Petit modèle", price: 100 }, { label: "Grand modèle", price: 150 }] },
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
         values ($1, $2, $3, $4, $5, $6::text::jsonb, $7::text::jsonb, $8)`,
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
    `insert into settings (id, data) values (1, $1::text::jsonb) on conflict (id) do nothing`,
    [JSON.stringify(DEFAULT_SETTINGS)],
  );

  // Carte de départ, une seule fois
  if (!(await isDone(db, "seed_menu_v1"))) {
    await db.transaction(async (tx) => {
      await tx.query(`select pg_advisory_xact_lock(4242002)`);
      const again = await tx.query(`select 1 from _migrations where id = 'seed_menu_v1'`);
      if (again.length > 0) return;
      const [{ count }] = await tx.query<{ count: number }>(`select count(*)::int as count from categories`);
      if (count === 0) await insertMenu(tx, INITIAL_MENU);
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
