"use client";

import { ArrowClockwiseIcon, BellRingingIcon, MagnifyingGlassIcon, ReceiptIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/admin-api";
import { useClientValue } from "@/lib/hooks/useMediaQuery";
import { formatDA, todayInAlgiers } from "@/lib/format";
import type { OrderStatus } from "@/lib/site-config";
import type { Order } from "@/lib/types";
import { PageHeader } from "./AdminShell";
import { OrderCard, PrintTicket } from "./OrderCard";
import { usePulse } from "./PulseContext";
import { Button, EmptyState, Segmented, inputClass, useToast } from "./ui";

type View = "active" | "history";
type Column = "pending" | "kitchen" | "ready";

const COLUMNS: { key: Column; title: string; statuses: OrderStatus[] }[] = [
  { key: "pending", title: "À confirmer", statuses: ["pending"] },
  { key: "kitchen", title: "En cuisine", statuses: ["confirmed", "preparing"] },
  { key: "ready", title: "Prêtes", statuses: ["ready"] },
];

/** Début de journée à Oran (UTC+1, sans heure d'été) il y a `days` jours, en ISO. */
function dayStartIso(daysAgo: number) {
  const today = todayInAlgiers();
  const d = new Date(`${today}T00:00:00+01:00`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

export function OrdersBoard({ defaultEta, restaurant }: { defaultEta: number; restaurant: string }) {
  const toast = useToast();
  const { version, refresh, notificationsOn, enableNotifications } = usePulse();
  const [view, setView] = useState<View>("active");
  const [column, setColumn] = useState<Column>("pending");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [history, setHistory] = useState<Order[] | null>(null);
  const [range, setRange] = useState<"0" | "1" | "7" | "30">("0");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState<Order | null>(null);
  const canNotify = useClientValue(() => "Notification" in window, false);

  /** Charge les commandes en cours ; l'indicateur de chargement n'apparaît que sur action manuelle. */
  const loadActive = useCallback(async (manual = false) => {
    if (manual) setLoading(true);
    try {
      const data = await api<{ orders: Order[] }>("/api/admin/orders?status=pending,confirmed,preparing,ready&limit=300");
      setOrders(data.orders);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chargement impossible", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadHistory = useCallback(async (manual = false) => {
    if (manual) setLoading(true);
    try {
      const params = new URLSearchParams({ status: "completed,rejected,cancelled", from: dayStartIso(Number(range)), limit: "400" });
      if (range === "1") params.set("to", dayStartIso(0));
      if (query.trim()) params.set("q", query.trim());
      const data = await api<{ orders: Order[] }>(`/api/admin/orders?${params}`);
      setHistory(data.orders);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chargement impossible", "error");
    } finally {
      setLoading(false);
    }
  }, [range, query, toast]);

  useEffect(() => {
    const first = window.setTimeout(() => loadActive(), 0);
    const id = window.setInterval(() => loadActive(), 20_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [loadActive, version]);

  useEffect(() => {
    if (view !== "history") return;
    const t = window.setTimeout(() => loadHistory(), query ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [view, loadHistory, query]);

  const update = async (order: Order, status: OrderStatus, extra?: { etaMinutes?: number | null; rejectReason?: string }) => {
    try {
      const { order: updated } = await api<{ order: Order }>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        json: { status, ...extra },
      });
      setOrders((list) => {
        if (!list) return list;
        const active = ["pending", "confirmed", "preparing", "ready"].includes(updated.status);
        return active ? list.map((o) => (o.id === updated.id ? updated : o)) : list.filter((o) => o.id !== updated.id);
      });
      setHistory((list) => list?.map((o) => (o.id === updated.id ? updated : o)).filter((o) => !["pending", "confirmed", "preparing", "ready"].includes(o.status)) ?? list);
      if (["pending", "confirmed", "preparing", "ready"].includes(updated.status) && !orders?.some((o) => o.id === updated.id)) {
        void loadActive();
      }
      refresh();
      const labels: Partial<Record<OrderStatus, string>> = {
        confirmed: "Commande confirmée",
        preparing: "En préparation",
        ready: "Commande prête",
        completed: "Commande terminée",
        rejected: "Commande refusée",
        cancelled: "Commande annulée",
        pending: "Commande remise en attente",
      };
      toast(`${labels[status] ?? "Mise à jour"} · ${updated.code}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action impossible", "error");
      void loadActive();
    }
  };

  const print = (order: Order) => {
    setPrinting(order);
    window.setTimeout(() => window.print(), 80);
  };

  const grouped = useMemo(() => {
    const map: Record<Column, Order[]> = { pending: [], kitchen: [], ready: [] };
    for (const o of orders ?? []) {
      const col = COLUMNS.find((c) => c.statuses.includes(o.status));
      if (col) map[col.key].push(o);
    }
    // Les plus anciennes d'abord : on traite dans l'ordre d'arrivée
    for (const key of Object.keys(map) as Column[]) map[key].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return map;
  }, [orders]);

  const historyTotal = (history ?? []).filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title="Commandes"
        sub="Confirmez chaque commande manuellement, puis suivez-la jusqu'à la remise."
        actions={
          <>
            {!notificationsOn && canNotify && (
              <Button size="sm" onClick={enableNotifications} icon={<BellRingingIcon size={15} weight="light" />}>
                Notifications
              </Button>
            )}
            <Button size="sm" onClick={() => (view === "active" ? loadActive(true) : loadHistory(true))} loading={loading} icon={<ArrowClockwiseIcon size={15} />}>
              Actualiser
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: `En cours${orders ? ` (${orders.length})` : ""}` },
            { value: "history", label: "Historique" },
          ]}
        />
        {view === "active" && (
          <div className="xl:hidden">
            <Segmented
              size="sm"
              value={column}
              onChange={setColumn}
              options={COLUMNS.map((c) => ({ value: c.key, label: `${c.title} ${grouped[c.key].length}` }))}
            />
          </div>
        )}
      </div>

      {view === "active" ? (
        orders === null ? (
          <div className="grid gap-5 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-72 rounded-[1.4rem]" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={28} weight="thin" />}
            title="Aucune commande en cours"
            text="Les nouvelles commandes apparaîtront ici avec une alerte sonore."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            {COLUMNS.map((col) => (
              <section key={col.key} className={`${column === col.key ? "block" : "hidden"} xl:block`} aria-label={col.title}>
                <h2 className="mb-3 hidden items-center gap-2 px-1 text-[13px] font-medium uppercase tracking-[0.16em] text-text-3 xl:flex">
                  {col.title}
                  <span className="tabular rounded-full bg-white/5 px-2 py-0.5 text-[12px] text-text-2">{grouped[col.key].length}</span>
                </h2>
                <div className="flex flex-col gap-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {grouped[col.key].map((order) => (
                      <OrderCard key={order.id} order={order} onUpdate={update} onPrint={print} defaultEta={defaultEta} />
                    ))}
                  </AnimatePresence>
                  {grouped[col.key].length === 0 && (
                    <p className="rounded-[1.4rem] border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-text-3">Rien ici pour le moment</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              options={[
                { value: "0", label: "Aujourd'hui" },
                { value: "1", label: "Hier" },
                { value: "7", label: "7 jours" },
                { value: "30", label: "30 jours" },
              ]}
            />
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <MagnifyingGlassIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                className={`${inputClass} rounded-full pl-10`}
                placeholder="Code, nom ou téléphone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher une commande"
              />
            </div>
            {history && (
              <p className="ml-auto text-[13px] text-text-3">
                {history.length} commande(s) · terminées : <span className="text-gold-200">{formatDA(historyTotal)}</span>
              </p>
            )}
          </div>
          {history === null ? (
            <div className="skeleton h-64 rounded-[1.4rem]" />
          ) : history.length === 0 ? (
            <EmptyState icon={<ReceiptIcon size={28} weight="thin" />} title="Aucune commande" text="Aucune commande terminée ou refusée sur cette période." />
          ) : (
            <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
              {history.map((order) => (
                <OrderCard key={order.id} order={order} onUpdate={update} onPrint={print} defaultEta={defaultEta} compact />
              ))}
            </div>
          )}
        </div>
      )}

      <PrintTicket order={printing} restaurant={restaurant} />
    </>
  );
}
