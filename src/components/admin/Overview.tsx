"use client";

import { ArrowRightIcon, BookOpenTextIcon, ChartLineUpIcon, GearSixIcon, ReceiptIcon, SparkleIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/admin-api";
import { useClientValue } from "@/lib/hooks/useMediaQuery";
import { formatDA, formatDay, formatNumber, todayInAlgiers } from "@/lib/format";
import type { OpenStatus } from "@/lib/hours";
import type { OrderStatus } from "@/lib/site-config";
import type { Stats } from "@/lib/server/stats";
import type { Order } from "@/lib/types";
import { ColumnChart } from "./charts";
import { OrderCard, PrintTicket } from "./OrderCard";
import { usePulse } from "./PulseContext";
import { Badge, Button, EmptyState, Panel, PanelTitle, Switch, useToast } from "./ui";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Algiers", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
}

export function Overview({
  username,
  initialToday,
  initialTrend,
  initialPending,
  status,
  orderingEnabled,
  menuIsSample,
  defaultEta,
  restaurant,
}: {
  username: string;
  initialToday: Stats;
  initialTrend: Stats;
  initialPending: Order[];
  status: OpenStatus;
  orderingEnabled: boolean;
  menuIsSample: boolean;
  defaultEta: number;
  restaurant: string;
}) {
  const toast = useToast();
  const { version, refresh } = usePulse();
  const [today, setToday] = useState(initialToday);
  const [trend, setTrend] = useState(initialTrend);
  const [pending, setPending] = useState(initialPending);
  const [enabled, setEnabled] = useState(orderingEnabled);
  const [printing, setPrinting] = useState<Order | null>(null);
  const hello = useClientValue(greeting, "Bonjour");

  const reload = useCallback(async () => {
    const date = todayInAlgiers();
    try {
      const [t, p] = await Promise.all([
        api<Stats>(`/api/admin/stats?from=${date}&to=${date}`),
        api<{ orders: Order[] }>("/api/admin/orders?status=pending&limit=50"),
      ]);
      setToday(t);
      setPending(p.orders);
    } catch {}
  }, []);

  useEffect(() => {
    if (version === 0) return;
    const t = window.setTimeout(reload, 0);
    return () => window.clearTimeout(t);
  }, [version, reload]);

  const update = async (order: Order, next: OrderStatus, extra?: { etaMinutes?: number | null; rejectReason?: string }) => {
    try {
      await api(`/api/admin/orders/${order.id}`, { method: "PATCH", json: { status: next, ...extra } });
      toast(next === "confirmed" ? `Commande ${order.code} confirmée` : `Commande ${order.code} mise à jour`);
      refresh();
      await reload();
      const from = trend.range.from;
      setTrend(await api<Stats>(`/api/admin/stats?from=${from}&to=${todayInAlgiers()}`));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action impossible", "error");
    }
  };

  const toggleOrdering = async (value: boolean) => {
    setEnabled(value);
    try {
      const { settings } = await api<{ settings: { ordering: Record<string, unknown> } }>("/api/admin/settings");
      await api("/api/admin/settings", { method: "PATCH", json: { ordering: { ...settings.ordering, enabled: value } } });
      toast(value ? "Commandes en ligne réactivées" : "Commandes en ligne suspendues");
    } catch (e) {
      setEnabled(!value);
      toast(e instanceof Error ? e.message : "Action impossible", "error");
    }
  };

  const s = today.summary;
  const trendData = trend.byDay.map((d) => ({
    key: d.day,
    label: formatDay(`${d.day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "short" }),
    tickLabel: formatDay(`${d.day}T12:00:00Z`, { day: "numeric" }),
    value: d.revenue,
  }));
  const trendTotal = trend.summary.revenue;

  return (
    <>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] capitalize text-text-3">
            {formatDay(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="mt-1 font-display text-[clamp(2.2rem,4vw,3.2rem)] font-medium leading-[1] text-text">
            {hello}, <em className="capitalize text-gold-200">{username}</em>
          </h1>
        </div>
        <div className="glass flex flex-wrap items-center gap-4 rounded-full px-5 py-3">
          <span className={`inline-flex items-center gap-2 text-[13px] ${status.isOpen ? "text-success" : "text-text-3"}`}>
            <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${status.isOpen ? "bg-success" : "bg-text-3"}`} />
            {status.label}
          </span>
          <span className="h-4 w-px bg-line-strong" />
          <span className="flex items-center gap-3 text-[13px] text-text-2">
            Commandes en ligne
            <Switch size="sm" label="Commandes en ligne" checked={enabled} onChange={toggleOrdering} />
            <span className={enabled ? "text-success" : "text-warning"}>{enabled ? "Actives" : "Suspendues"}</span>
          </span>
        </div>
      </div>

      {menuIsSample && (
        <Link
          href="/admin/carte"
          className="mb-6 flex items-center gap-3 rounded-[1.4rem] bg-[color-mix(in_oklab,var(--accent)_9%,transparent)] p-4 text-[14px] text-gold-50 ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)] transition-colors hover:ring-gold-300"
        >
          <SparkleIcon size={20} weight="light" className="shrink-0 text-gold-200" />
          <span className="flex-1">La carte affichée est un exemple. Importez votre vraie carte en quelques secondes.</span>
          <ArrowRightIcon size={16} />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.4rem] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_16%,var(--surface-2)),var(--surface))] p-5 ring-1 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]">
          <p className="text-[13px] text-text-3">Chiffre d&apos;affaires du jour</p>
          <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-gold-100">{formatDA(s.revenue)}</p>
          <p className="mt-2 text-[12px] text-text-3">commandes acceptées</p>
        </div>
        <div className="rounded-[1.4rem] bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] p-5 ring-1 ring-line">
          <p className="text-[13px] text-text-3">Commandes du jour</p>
          <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-text">{formatNumber(s.orders)}</p>
          <p className="mt-2 text-[12px] text-text-3">{s.rejected} refusée(s)</p>
        </div>
        <Link href="/admin/commandes" className="group rounded-[1.4rem] bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] p-5 ring-1 ring-line transition-colors hover:ring-line-strong">
          <p className="flex items-center justify-between text-[13px] text-text-3">
            En attente de confirmation
            <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
          </p>
          <p className={`mt-2 text-[2rem] font-semibold leading-none tracking-tight ${pending.length ? "text-warning" : "text-text"}`}>{pending.length}</p>
          <p className="mt-2 text-[12px] text-text-3">{pending.length ? "à traiter maintenant" : "tout est à jour"}</p>
        </Link>
        <div className="rounded-[1.4rem] bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] p-5 ring-1 ring-line">
          <p className="text-[13px] text-text-3">Panier moyen du jour</p>
          <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-text">{formatDA(s.averageTicket)}</p>
          <p className="mt-2 text-[12px] text-text-3">{formatNumber(s.itemsSold)} articles vendus</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Panel>
          <PanelTitle
            sub="Les plus anciennes en premier"
            action={
              pending.length > 0 && (
                <Link href="/admin/commandes" className="text-[13px] text-gold-300 hover:text-gold-200">
                  Tout voir
                </Link>
              )
            }
          >
            À confirmer
          </PanelTitle>
          {pending.length === 0 ? (
            <EmptyState icon={<ReceiptIcon size={26} weight="thin" />} title="Aucune commande en attente" text="Vous serez alerté dès qu'une commande arrive." />
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence initial={false} mode="popLayout">
                {[...pending]
                  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                  .slice(0, 4)
                  .map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdate={update}
                      onPrint={(o) => {
                        setPrinting(o);
                        window.setTimeout(() => window.print(), 80);
                      }}
                      defaultEta={defaultEta}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelTitle sub={`${formatDA(trendTotal)} sur 14 jours · ${formatNumber(trend.summary.orders)} commandes`} action={<Badge tone="gold">14 jours</Badge>}>
              Tendance
            </PanelTitle>
            <ColumnChart data={trendData} format={formatDA} ariaLabel="Chiffre d'affaires des 14 derniers jours" height={200} />
          </Panel>
          <Panel>
            <PanelTitle sub="Sur 14 jours">Meilleures ventes</PanelTitle>
            {trend.topItems.length === 0 ? (
              <p className="py-4 text-[13px] text-text-3">Les ventes apparaîtront ici.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {trend.topItems.slice(0, 5).map((item, i) => (
                  <li key={item.name} className="flex items-center gap-4 py-2.5 text-[14px]">
                    <span className="w-5 font-display text-lg text-gold-300">{i + 1}</span>
                    <span className="flex-1 truncate text-text">{item.name}</span>
                    <span className="tabular text-text-3">{item.quantity} vendus</span>
                    <span className="tabular w-24 text-right text-text">{formatDA(item.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: "/admin/carte", label: "Modifier la carte", icon: BookOpenTextIcon },
              { href: "/admin/revenus", label: "Voir les revenus", icon: ChartLineUpIcon },
              { href: "/admin/reglages", label: "Réglages", icon: GearSixIcon },
            ].map(({ href, label, icon: IconCmp }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-[1.2rem] px-3 py-4 text-center text-[13px] text-text-2 ring-1 ring-line transition-colors hover:text-text hover:ring-line-strong">
                <IconCmp size={22} weight="light" className="text-gold-300" />
                {label}
              </Link>
            ))}
          </div>
          <Button variant="subtle" className="self-start" onClick={() => void reload()}>
            Actualiser les chiffres
          </Button>
        </div>
      </div>
      <PrintTicket order={printing} restaurant={restaurant} />
    </>
  );
}
