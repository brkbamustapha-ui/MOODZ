import "server-only";
import { randomInt } from "node:crypto";
import { getDb, type Queryable } from "../db";
import { getOpenStatus } from "../hours";
import type { OrderStatus, SiteSettings } from "../site-config";
import type { Order, OrderLine, PublicOrder } from "../types";
import type { OrderInput } from "../validation";
import { mapItem } from "./menu";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `MZ-${code}`;
}

type OrderRow = {
  id: number;
  code: string;
  status: OrderStatus;
  order_type: Order["orderType"];
  customer_name: string;
  customer_phone: string;
  address: string | null;
  table_number: string | null;
  notes: string | null;
  scheduled_for: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  eta_minutes: number | null;
  reject_reason: string | null;
  created_at: Date | string;
  confirmed_at: Date | string | null;
  completed_at: Date | string | null;
  updated_at: Date | string;
};

type LineRow = {
  id: number;
  order_id: number;
  item_id: number | null;
  category_name: string;
  name: string;
  variant: string | null;
  unit_price: number;
  unit_cost: number | null;
  quantity: number;
  line_total: number;
};

const iso = (value: Date | string | null) => (value == null ? null : new Date(value).toISOString());

function mapLine(row: LineRow): OrderLine {
  return {
    id: row.id,
    itemId: row.item_id,
    categoryName: row.category_name,
    name: row.name,
    variant: row.variant,
    unitPrice: row.unit_price,
    unitCost: row.unit_cost,
    quantity: row.quantity,
    lineTotal: row.line_total,
  };
}

function mapOrder(row: OrderRow, lines: LineRow[]): Order {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    orderType: row.order_type,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    tableNumber: row.table_number,
    notes: row.notes,
    scheduledFor: row.scheduled_for,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    etaMinutes: row.eta_minutes,
    rejectReason: row.reject_reason,
    createdAt: iso(row.created_at)!,
    confirmedAt: iso(row.confirmed_at),
    completedAt: iso(row.completed_at),
    updatedAt: iso(row.updated_at)!,
    items: lines.filter((l) => l.order_id === row.id).map(mapLine),
  };
}

const ORDER_COLUMNS = `id, code, status, order_type, customer_name, customer_phone, address, table_number, notes,
  scheduled_for, subtotal, delivery_fee, total, eta_minutes, reject_reason, created_at, confirmed_at,
  completed_at, updated_at`;

async function loadLines(db: Queryable, orderIds: number[]): Promise<LineRow[]> {
  if (orderIds.length === 0) return [];
  return db.query<LineRow>(
    `select id, order_id, item_id, category_name, name, variant, unit_price, unit_cost, quantity, line_total
     from order_items where order_id = any($1::int[]) order by id`,
    [orderIds],
  );
}

export class OrderError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

/** Crée une commande : les prix sont toujours recalculés depuis la base, jamais repris du navigateur. */
export async function placeOrder(input: OrderInput, settings: SiteSettings, clientHash: string) {
  const { ordering } = settings;
  if (!ordering.enabled) {
    throw new OrderError("Les commandes en ligne sont momentanément suspendues.", 409);
  }
  if (!ordering.allowWhenClosed && !getOpenStatus(settings.hours).isOpen) {
    throw new OrderError("Nous sommes fermés pour le moment. Revenez pendant nos horaires d'ouverture.", 409);
  }
  const typeEnabled =
    (input.orderType === "pickup" && ordering.pickup) ||
    (input.orderType === "delivery" && ordering.delivery) ||
    (input.orderType === "dine_in" && ordering.dineIn);
  if (!typeEnabled) throw new OrderError("Ce mode de commande n'est pas disponible.", 409);

  const db = await getDb();
  const ids = [...new Set(input.items.map((l) => l.itemId))];
  const rows = await db.query<Parameters<typeof mapItem>[0] & { category_name: string; category_visible: boolean }>(
    `select i.id, i.category_id, i.name, i.description, i.price, i.cost, i.variants, i.tags, i.is_available,
            i.is_visible, i.position, c.name as category_name, c.is_visible as category_visible
     from menu_items i join categories c on c.id = i.category_id
     where i.id = any($1::int[])`,
    [ids],
  );
  const byId = new Map(rows.map((r) => [r.id, { item: mapItem(r), categoryName: r.category_name, visible: r.category_visible }]));

  // Regroupe les lignes identiques (même article, même variante)
  const merged = new Map<string, { itemId: number; variant: string | null; quantity: number }>();
  for (const line of input.items) {
    const key = `${line.itemId}:${line.variant ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { itemId: line.itemId, variant: line.variant ?? null, quantity: (prev?.quantity ?? 0) + line.quantity });
  }

  const lines = [...merged.values()].map((line) => {
    const entry = byId.get(line.itemId);
    if (!entry || !entry.item.isVisible || !entry.visible) {
      throw new OrderError("Un article de votre panier n'est plus à la carte. Actualisez la page.", 409);
    }
    const { item, categoryName } = entry;
    if (!item.isAvailable) throw new OrderError(`« ${item.name} » est épuisé pour le moment.`, 409);
    let unitPrice = item.price;
    let variant: string | null = null;
    if (item.variants.length > 0) {
      const chosen = item.variants.find((v) => v.label === line.variant) ?? null;
      if (!chosen) throw new OrderError(`Choisissez une option pour « ${item.name} ».`, 400);
      unitPrice = chosen.price;
      variant = chosen.label;
    }
    const quantity = Math.min(line.quantity, 50);
    // Coût unitaire : proportionnel au prix de la variante si un coût est renseigné
    const unitCost = item.cost == null ? null : Math.round(item.price > 0 ? (item.cost * unitPrice) / item.price : item.cost);
    return { item, categoryName, variant, unitPrice, unitCost, quantity, lineTotal: unitPrice * quantity };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  let deliveryFee = 0;
  if (input.orderType === "delivery") {
    if (subtotal < ordering.minDeliveryOrder) {
      throw new OrderError(`Minimum de ${ordering.minDeliveryOrder} DA pour la livraison.`, 400);
    }
    deliveryFee = ordering.freeDeliveryFrom > 0 && subtotal >= ordering.freeDeliveryFrom ? 0 : ordering.deliveryFee;
  }
  const total = subtotal + deliveryFee;

  return db.transaction(async (tx) => {
    let code = generateOrderCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await tx.query(`select 1 from orders where code = $1`, [code]);
      if (clash.length === 0) break;
      code = generateOrderCode();
    }
    const [order] = await tx.query<{ id: number }>(
      `insert into orders (code, order_type, customer_name, customer_phone, address, table_number, notes,
         scheduled_for, subtotal, delivery_fee, total, client_hash)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
      [
        code,
        input.orderType,
        input.customerName,
        input.customerPhone,
        input.orderType === "delivery" ? input.address : null,
        input.orderType === "dine_in" ? input.tableNumber || null : null,
        input.notes || null,
        input.scheduledFor,
        subtotal,
        deliveryFee,
        total,
        clientHash,
      ],
    );
    for (const line of lines) {
      await tx.query(
        `insert into order_items (order_id, item_id, category_name, name, variant, unit_price, unit_cost, quantity, line_total)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [order.id, line.item.id, line.categoryName, line.item.name, line.variant, line.unitPrice, line.unitCost, line.quantity, line.lineTotal],
      );
    }
    return { id: order.id, code, total };
  });
}

export async function getPublicOrder(code: string): Promise<PublicOrder | null> {
  const db = await getDb();
  const [row] = await db.query<OrderRow>(`select ${ORDER_COLUMNS} from orders where code = $1`, [code]);
  if (!row) return null;
  const lines = await loadLines(db, [row.id]);
  const order = mapOrder(row, lines);
  return {
    code: order.code,
    status: order.status,
    orderType: order.orderType,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    etaMinutes: order.etaMinutes,
    rejectReason: order.rejectReason,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    scheduledFor: order.scheduledFor,
    tableNumber: order.tableNumber,
    firstName: order.customerName.split(/\s+/)[0] ?? "",
    items: order.items.map((l) => ({ name: l.name, variant: l.variant, quantity: l.quantity, lineTotal: l.lineTotal })),
  };
}

export type OrderFilter = {
  status?: OrderStatus[];
  from?: string; // ISO
  to?: string; // ISO
  search?: string;
  limit?: number;
};

export async function listOrders(filter: OrderFilter = {}): Promise<Order[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.status?.length) {
    params.push(filter.status);
    where.push(`status = any($${params.length}::text[])`);
  }
  if (filter.from) {
    params.push(filter.from);
    where.push(`created_at >= $${params.length}::timestamptz`);
  }
  if (filter.to) {
    params.push(filter.to);
    where.push(`created_at < $${params.length}::timestamptz`);
  }
  if (filter.search) {
    params.push(`%${filter.search.replace(/[%_\\]/g, "")}%`);
    where.push(`(code ilike $${params.length} or customer_name ilike $${params.length} or customer_phone ilike $${params.length})`);
  }
  params.push(Math.min(1000, Math.max(1, Math.floor(filter.limit ?? 200))));
  const rows = await db.query<OrderRow>(
    `select ${ORDER_COLUMNS} from orders ${where.length ? `where ${where.join(" and ")}` : ""}
     order by created_at desc limit $${params.length}`,
    params,
  );
  const lines = await loadLines(db, rows.map((r) => r.id));
  return rows.map((r) => mapOrder(r, lines));
}

export async function getOrderById(id: number): Promise<Order | null> {
  const db = await getDb();
  const [row] = await db.query<OrderRow>(`select ${ORDER_COLUMNS} from orders where id = $1`, [id]);
  if (!row) return null;
  return mapOrder(row, await loadLines(db, [row.id]));
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "completed", "rejected", "cancelled"],
  confirmed: ["pending", "preparing", "ready", "completed", "cancelled"],
  preparing: ["ready", "completed", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  rejected: ["pending"],
  cancelled: ["pending"],
};

export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}

export async function updateOrderStatus(
  id: number,
  next: OrderStatus,
  { etaMinutes, rejectReason }: { etaMinutes?: number | null; rejectReason?: string },
): Promise<Order> {
  const db = await getDb();
  const current = await getOrderById(id);
  if (!current) throw new OrderError("Commande introuvable.", 404);
  if (current.status !== next && !TRANSITIONS[current.status].includes(next)) {
    throw new OrderError("Changement de statut impossible.", 409);
  }
  await db.query(
    `update orders set
       status = $2,
       eta_minutes = case when $3::boolean then $4::integer else eta_minutes end,
       reject_reason = case when $2 in ('rejected', 'cancelled') then nullif($5, '') when $2 = 'pending' then null else reject_reason end,
       confirmed_at = case when $2 in ('confirmed', 'preparing', 'ready', 'completed') and confirmed_at is null then now()
                           when $2 = 'pending' then null else confirmed_at end,
       completed_at = case when $2 = 'completed' then now() when $2 = 'pending' then null else completed_at end,
       updated_at = now()
     where id = $1`,
    [id, next, etaMinutes !== undefined, etaMinutes ?? null, rejectReason ?? ""],
  );
  return (await getOrderById(id))!;
}

/** Nombre de commandes en attente et identifiant le plus récent (pour les alertes du tableau de bord). */
export async function getOrderPulse(): Promise<{ pending: number; latestId: number; active: number }> {
  const db = await getDb();
  const [row] = await db.query<{ pending: number; latest: number | null; active: number }>(
    `select count(*) filter (where status = 'pending')::int as pending,
            count(*) filter (where status in ('confirmed','preparing','ready'))::int as active,
            max(id)::int as latest
     from orders`,
  );
  return { pending: row.pending, latestId: row.latest ?? 0, active: row.active };
}
