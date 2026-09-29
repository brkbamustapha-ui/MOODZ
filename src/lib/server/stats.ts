import "server-only";
import { getDb } from "../db";
import { TIMEZONE } from "../format";
import { REVENUE_STATUSES, type OrderType } from "../site-config";

export type StatsRange = { from: string; to: string }; // AAAA-MM-JJ inclus, heure d'Oran

export type Stats = {
  range: StatsRange;
  summary: {
    revenue: number;
    orders: number;
    averageTicket: number;
    itemsSold: number;
    deliveryFees: number;
    allOrders: number;
    rejected: number;
    pending: number;
    costKnown: number;
    revenueWithCost: number;
    revenueWithoutCost: number;
  };
  previous: { revenue: number; orders: number };
  byDay: { day: string; revenue: number; orders: number }[];
  byType: { type: OrderType; revenue: number; orders: number }[];
  byHour: { hour: number; revenue: number; orders: number }[];
  byCategory: { category: string; revenue: number; quantity: number }[];
  topItems: { name: string; quantity: number; revenue: number; cost: number | null }[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export function normalizeRange(from?: string | null, to?: string | null, today = new Date()): StatsRange {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(today);
  let f = from && DATE_RE.test(from) ? from : shiftDate(todayStr, -29);
  let t = to && DATE_RE.test(to) ? to : todayStr;
  if (f > t) [f, t] = [t, f];
  if (daysBetween(f, t) > 400) f = shiftDate(t, -399);
  return { from: f, to: t };
}

export async function getStats(range: StatsRange): Promise<Stats> {
  const db = await getDb();
  const statuses = REVENUE_STATUSES;
  // Bornes en heure locale d'Oran : [from 00:00, to+1 00:00)
  const bounds = `($1::date::timestamp at time zone '${TIMEZONE}') and created_at < (($2::date + 1)::timestamp at time zone '${TIMEZONE}')`;
  const params = [range.from, range.to, statuses];

  const [summary] = await db.query<{
    revenue: number;
    orders: number;
    delivery_fees: number;
    all_orders: number;
    rejected: number;
    pending: number;
  }>(
    `select
       coalesce(sum(total) filter (where status = any($3::text[])), 0)::float8 as revenue,
       (count(*) filter (where status = any($3::text[])))::int as orders,
       coalesce(sum(delivery_fee) filter (where status = any($3::text[])), 0)::float8 as delivery_fees,
       count(*)::int as all_orders,
       (count(*) filter (where status in ('rejected', 'cancelled')))::int as rejected,
       (count(*) filter (where status = 'pending'))::int as pending
     from orders where created_at >= ${bounds}`,
    params,
  );

  const [lines] = await db.query<{ items_sold: number; cost_known: number; revenue_with_cost: number; revenue_without_cost: number }>(
    `select
       coalesce(sum(oi.quantity), 0)::int as items_sold,
       coalesce(sum(oi.unit_cost * oi.quantity) filter (where oi.unit_cost is not null), 0)::float8 as cost_known,
       coalesce(sum(oi.line_total) filter (where oi.unit_cost is not null), 0)::float8 as revenue_with_cost,
       coalesce(sum(oi.line_total) filter (where oi.unit_cost is null), 0)::float8 as revenue_without_cost
     from order_items oi join orders o on o.id = oi.order_id
     where o.status = any($3::text[]) and o.created_at >= ${bounds.replaceAll("created_at", "o.created_at")}`,
    params,
  );

  const length = daysBetween(range.from, range.to);
  const prevFrom = shiftDate(range.from, -length);
  const prevTo = shiftDate(range.from, -1);
  const [previous] = await db.query<{ revenue: number; orders: number }>(
    `select coalesce(sum(total), 0)::float8 as revenue, count(*)::int as orders
     from orders where status = any($3::text[]) and created_at >= ${bounds}`,
    [prevFrom, prevTo, statuses],
  );

  const byDay = await db.query<{ day: string; revenue: number; orders: number }>(
    `with days as (
       select to_char(d, 'YYYY-MM-DD') as day from generate_series($1::date, $2::date, interval '1 day') d
     ),
     agg as (
       select to_char(created_at at time zone '${TIMEZONE}', 'YYYY-MM-DD') as day,
              sum(total)::float8 as revenue, count(*)::int as orders
       from orders where status = any($3::text[]) and created_at >= ${bounds}
       group by 1
     )
     select days.day, coalesce(agg.revenue, 0)::float8 as revenue, coalesce(agg.orders, 0)::int as orders
     from days left join agg on agg.day = days.day order by days.day`,
    params,
  );

  const byType = await db.query<{ type: OrderType; revenue: number; orders: number }>(
    `select order_type as type, sum(total)::float8 as revenue, count(*)::int as orders
     from orders where status = any($3::text[]) and created_at >= ${bounds}
     group by order_type order by revenue desc`,
    params,
  );

  const byHour = await db.query<{ hour: number; revenue: number; orders: number }>(
    `select extract(hour from created_at at time zone '${TIMEZONE}')::int as hour,
            sum(total)::float8 as revenue, count(*)::int as orders
     from orders where status = any($3::text[]) and created_at >= ${bounds}
     group by 1 order by 1`,
    params,
  );

  const byCategory = await db.query<{ category: string; revenue: number; quantity: number }>(
    `select coalesce(nullif(oi.category_name, ''), 'Autres') as category,
            sum(oi.line_total)::float8 as revenue, sum(oi.quantity)::int as quantity
     from order_items oi join orders o on o.id = oi.order_id
     where o.status = any($3::text[]) and o.created_at >= ${bounds.replaceAll("created_at", "o.created_at")}
     group by 1 order by revenue desc`,
    params,
  );

  const topItems = await db.query<{ name: string; quantity: number; revenue: number; cost: number | null }>(
    `select oi.name,
            sum(oi.quantity)::int as quantity,
            sum(oi.line_total)::float8 as revenue,
            case when bool_and(oi.unit_cost is not null) then sum(oi.unit_cost * oi.quantity)::float8 end as cost
     from order_items oi join orders o on o.id = oi.order_id
     where o.status = any($3::text[]) and o.created_at >= ${bounds.replaceAll("created_at", "o.created_at")}
     group by oi.name order by revenue desc limit 12`,
    params,
  );

  const hours = Array.from({ length: 24 }, (_, hour) => {
    const found = byHour.find((h) => h.hour === hour);
    return { hour, revenue: found?.revenue ?? 0, orders: found?.orders ?? 0 };
  });

  return {
    range,
    summary: {
      revenue: summary.revenue,
      orders: summary.orders,
      averageTicket: summary.orders ? summary.revenue / summary.orders : 0,
      itemsSold: lines.items_sold,
      deliveryFees: summary.delivery_fees,
      allOrders: summary.all_orders,
      rejected: summary.rejected,
      pending: summary.pending,
      costKnown: lines.cost_known,
      revenueWithCost: lines.revenue_with_cost,
      revenueWithoutCost: lines.revenue_without_cost,
    },
    previous,
    byDay,
    byType,
    byHour: hours,
    byCategory,
    topItems,
  };
}

/** Commandes de la période pour l'export CSV. */
export async function getOrdersForExport(range: StatsRange) {
  const db = await getDb();
  return db.query<{
    code: string;
    created: string;
    status: string;
    order_type: string;
    customer_name: string;
    customer_phone: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
    items: string;
  }>(
    `select o.code,
            to_char(o.created_at at time zone '${TIMEZONE}', 'YYYY-MM-DD HH24:MI') as created,
            o.status, o.order_type, o.customer_name, o.customer_phone, o.subtotal, o.delivery_fee, o.total,
            coalesce(string_agg(oi.quantity || ' x ' || oi.name || coalesce(' (' || oi.variant || ')', ''), ' ; ' order by oi.id), '') as items
     from orders o left join order_items oi on oi.order_id = o.id
     where o.created_at >= ($1::date::timestamp at time zone '${TIMEZONE}')
       and o.created_at < (($2::date + 1)::timestamp at time zone '${TIMEZONE}')
     group by o.id order by o.created_at`,
    [range.from, range.to],
  );
}
