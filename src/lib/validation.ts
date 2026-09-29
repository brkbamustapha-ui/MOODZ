import { z } from "zod";
import { CATEGORY_ICONS, DAY_KEYS, ITEM_TAGS, ORDER_STATUSES, ORDER_TYPES } from "./site-config";

const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max));

/** Téléphone algérien ou international : 9 à 15 chiffres, "+" optionnel. */
export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s.\-()]/g, ""))
  .pipe(z.string().regex(/^\+?\d{9,15}$/, "Numéro de téléphone invalide"));

export const orderInputSchema = z
  .object({
    items: z
      .array(
        z.object({
          itemId: z.number().int().positive(),
          variant: z.string().max(60).nullable().optional(),
          quantity: z.number().int().min(1).max(50),
        }),
      )
      .min(1, "Votre panier est vide")
      .max(60),
    orderType: z.enum(ORDER_TYPES),
    customerName: cleanText(60).pipe(z.string().min(2, "Indiquez votre nom")),
    customerPhone: phoneSchema,
    address: cleanText(240).optional().default(""),
    tableNumber: cleanText(12).optional().default(""),
    notes: cleanText(400).optional().default(""),
    scheduledFor: z
      .string()
      .regex(/^(asap|([01]\d|2[0-3]):[0-5]\d)$/)
      .optional()
      .default("asap"),
    website: z.string().max(0).optional(), // pot de miel anti-robots
  })
  .superRefine((value, ctx) => {
    if (value.orderType === "delivery" && value.address.length < 6) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Indiquez une adresse de livraison" });
    }
  });
export type OrderInput = z.infer<typeof orderInputSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

const variantSchema = z.object({
  label: cleanText(40).pipe(z.string().min(1)),
  price: z.number().int().min(0).max(1_000_000),
});

const tagSchema = z.enum(Object.keys(ITEM_TAGS) as [keyof typeof ITEM_TAGS, ...(keyof typeof ITEM_TAGS)[]]);

// Champs sans valeurs par défaut : avec Zod 4, `.partial()` appliquerait sinon les défauts
// aux clés absentes, et une mise à jour partielle écraserait des données existantes.
const itemFields = {
  categoryId: z.number().int().positive(),
  name: cleanText(80).pipe(z.string().min(1, "Nom requis")),
  description: cleanText(280),
  price: z.number().int().min(0).max(1_000_000),
  cost: z.number().int().min(0).max(1_000_000).nullable(),
  variants: z.array(variantSchema).max(8),
  tags: z.array(tagSchema).max(5),
  isAvailable: z.boolean(),
  isVisible: z.boolean(),
};

export const itemInputSchema = z.object({
  ...itemFields,
  description: itemFields.description.default(""),
  cost: itemFields.cost.default(null),
  variants: itemFields.variants.default([]),
  tags: itemFields.tags.default([]),
  isAvailable: itemFields.isAvailable.default(true),
  isVisible: itemFields.isVisible.default(true),
});
/** Mise à jour partielle : seules les clés envoyées sont modifiées. */
export const itemPatchSchema = z.object(itemFields).partial();

const categoryFields = {
  name: cleanText(60).pipe(z.string().min(1, "Nom requis")),
  description: cleanText(200),
  icon: z.enum(CATEGORY_ICONS),
  isVisible: z.boolean(),
};

export const categoryInputSchema = z.object({
  ...categoryFields,
  description: categoryFields.description.default(""),
  icon: categoryFields.icon.default("fork-knife"),
  isVisible: categoryFields.isVisible.default(true),
});
export const categoryPatchSchema = z.object(categoryFields).partial();

export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).max(500),
  categoryId: z.number().int().positive().optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  etaMinutes: z.number().int().min(0).max(600).nullable().optional(),
  rejectReason: cleanText(200).optional(),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dayHours = z.object({ closed: z.boolean(), open: hhmm, close: hhmm });

const httpUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Lien invalide (https://...)");

export const settingsSchema = z.object({
  restaurantName: cleanText(40).pipe(z.string().min(1)),
  tagline: cleanText(60),
  heroSubtitle: cleanText(160),
  aboutTitle: cleanText(80),
  aboutText: cleanText(900),
  address: cleanText(160),
  mapsUrl: httpUrl,
  phone: cleanText(30),
  whatsapp: cleanText(30),
  instagram: httpUrl,
  tiktok: httpUrl,
  hours: z.object(Object.fromEntries(DAY_KEYS.map((d) => [d, dayHours])) as Record<(typeof DAY_KEYS)[number], typeof dayHours>),
  ordering: z.object({
    enabled: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    dineIn: z.boolean(),
    deliveryFee: z.number().int().min(0).max(100_000),
    freeDeliveryFrom: z.number().int().min(0).max(1_000_000),
    minDeliveryOrder: z.number().int().min(0).max(1_000_000),
    allowWhenClosed: z.boolean(),
    estimatedMinutes: z.number().int().min(5).max(240),
    notice: cleanText(240),
  }),
  theme: z.object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  logoDataUrl: z
    .string()
    .max(700_000)
    .regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/)
    .nullable(),
  finance: z.object({
    foodCostPct: z.number().min(0).max(100),
    fixedCosts: z.array(z.object({ label: cleanText(60), amount: z.number().int().min(0).max(100_000_000) })).max(30),
  }),
  menuIsSample: z.boolean(),
});

export const accountSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "3 à 40 caractères : lettres, chiffres, point, tiret")
    .optional(),
  newPassword: z.string().min(8, "8 caractères minimum").max(200).optional(),
});

export const importSchema = z.object({
  text: z.string().min(1).max(60_000),
  mode: z.enum(["append", "replace"]),
  dryRun: z.boolean().optional(),
});

export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message && !issue.message.startsWith("Invalid") ? issue.message : "Données invalides";
}
