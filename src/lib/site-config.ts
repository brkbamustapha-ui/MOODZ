/** Types et valeurs par défaut partagés entre le serveur et le client. */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lundi",
  tue: "Mardi",
  wed: "Mercredi",
  thu: "Jeudi",
  fri: "Vendredi",
  sat: "Samedi",
  sun: "Dimanche",
};

export type DayHours = { closed: boolean; open: string; close: string };
export type OpeningHours = Record<DayKey, DayHours>;

export type FixedCost = { label: string; amount: number };

export type SiteSettings = {
  restaurantName: string;
  tagline: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  address: string;
  mapsUrl: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  hours: OpeningHours;
  ordering: {
    enabled: boolean;
    pickup: boolean;
    delivery: boolean;
    dineIn: boolean;
    deliveryFee: number;
    freeDeliveryFrom: number;
    minDeliveryOrder: number;
    allowWhenClosed: boolean;
    estimatedMinutes: number;
    notice: string;
  };
  theme: { accent: string };
  logoDataUrl: string | null;
  finance: { foodCostPct: number; fixedCosts: FixedCost[] };
  menuIsSample: boolean;
};

/** Réglages visibles côté public (sans les données financières). */
export type PublicSettings = Omit<SiteSettings, "finance" | "menuIsSample">;

const everyday = (open: string, close: string): DayHours => ({ closed: false, open, close });

export const DEFAULT_SETTINGS: SiteSettings = {
  restaurantName: "MOODZ",
  tagline: "Café · Restaurant",
  heroSubtitle: "Pizzas, burgers, tacos, sandwichs et plats généreux, au cœur de Gambetta à Oran.",
  aboutTitle: "Un lieu pour chaque humeur",
  aboutText:
    "MOODZ, c'est le rendez-vous gourmand de Gambetta. Pizzas en trois tailles, burgers simples ou doubles, " +
    "tacos gratinés, sandwichs au pain artisanal et plats de viande : une carte généreuse pour chaque humeur. " +
    "Feed your mood.",
  address: "Gambetta, Oran, Algérie",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=MOODZ+Gambetta+Oran",
  phone: "",
  whatsapp: "",
  instagram: "https://www.instagram.com/moodzoran",
  tiktok: "https://www.tiktok.com/@moodzoran",
  hours: {
    mon: everyday("08:00", "23:30"),
    tue: everyday("08:00", "23:30"),
    wed: everyday("08:00", "23:30"),
    thu: everyday("08:00", "23:30"),
    fri: everyday("13:00", "23:59"),
    sat: everyday("08:00", "23:59"),
    sun: everyday("08:00", "23:30"),
  },
  ordering: {
    enabled: true,
    pickup: true,
    delivery: true,
    dineIn: true,
    deliveryFee: 200,
    freeDeliveryFrom: 4000,
    minDeliveryOrder: 1000,
    allowWhenClosed: false,
    estimatedMinutes: 30,
    notice: "Chaque commande est confirmée manuellement par notre équipe, souvent par un appel rapide.",
  },
  // Olive du logo MOODZ « Feed your mood »
  theme: { accent: "#738C1F" },
  logoDataUrl: null,
  finance: {
    foodCostPct: 32,
    fixedCosts: [
      { label: "Loyer", amount: 150000 },
      { label: "Salaires", amount: 320000 },
      { label: "Électricité, eau, gaz", amount: 45000 },
      { label: "Internet et divers", amount: 15000 },
    ],
  },
  menuIsSample: false,
};

export const ORDER_TYPES = ["pickup", "delivery", "dine_in"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  pickup: "À emporter",
  delivery: "Livraison",
  dine_in: "Sur place",
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "rejected",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  completed: "Terminée",
  rejected: "Refusée",
  cancelled: "Annulée",
};

/** Statuts comptés dans le chiffre d'affaires (commande acceptée par le restaurant). */
export const REVENUE_STATUSES: OrderStatus[] = ["confirmed", "preparing", "ready", "completed"];

export const ITEM_TAGS = {
  signature: "Signature",
  new: "Nouveau",
  popular: "Populaire",
  spicy: "Épicé",
  veggie: "Végétarien",
} as const;
export type ItemTag = keyof typeof ITEM_TAGS;

export const CATEGORY_ICONS = [
  "coffee",
  "coffee-bean",
  "drop",
  "orange-slice",
  "martini",
  "egg",
  "bread",
  "cake",
  "cookie",
  "ice-cream",
  "leaf",
  "avocado",
  "hamburger",
  "pizza",
  "bowl-food",
  "bowl-steam",
  "cooking-pot",
  "fork-knife",
  "fish",
  "cheese",
  "pepper",
  "cherries",
  "popsicle",
  "sparkle",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
