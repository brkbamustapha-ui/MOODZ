"use client";

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalculatorIcon,
  DownloadSimpleIcon,
  FloppyDiskIcon,
  MinusIcon,
  PlusIcon,
  TableIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/admin-api";
import { formatDA, formatDay, formatNumber, formatPercent, todayInAlgiers } from "@/lib/format";
import { ORDER_TYPE_LABELS, type FixedCost, type OrderType, type SiteSettings } from "@/lib/site-config";
import type { Stats } from "@/lib/server/stats";
import { PageHeader } from "./AdminShell";
import { BarList, ColumnChart, SERIES, StackedShare } from "./charts";
import { Button, IconButton, Panel, PanelTitle, inputClass, useToast } from "./ui";

type Preset = "today" | "7d" | "30d" | "month" | "lastMonth" | "90d" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "month", label: "Ce mois" },
  { key: "lastMonth", label: "Mois dernier" },
  { key: "90d", label: "90 jours" },
  { key: "custom", label: "Personnalisé" },
];

function shift(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function rangeFor(preset: Preset, today = todayInAlgiers()): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: shift(today, -6), to: today };
    case "30d":
      return { from: shift(today, -29), to: today };
    case "90d":
      return { from: shift(today, -89), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "lastMonth": {
      const first = new Date(Date.UTC(y, m - 2, 1));
      const last = new Date(Date.UTC(y, m - 1, 0));
      return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
    }
    default:
      return { from: shift(today, -29), to: today };
  }
}

const daysIn = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

function Delta({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous <= 0) {
    return <span className="text-[12px] text-text-3">{current > 0 ? "Nouvelle activité sur la période" : "Aucune donnée à comparer"}</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const good = invert ? !up : up;
  const Icon = Math.abs(pct) < 0.5 ? MinusIcon : up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${Math.abs(pct) < 0.5 ? "text-text-3" : good ? "text-success" : "text-danger"}`}>
      <Icon size={13} weight="bold" aria-hidden />
      {up ? "+" : ""}
      {formatNumber(pct, 1)} % <span className="text-text-3">vs période précédente</span>
    </span>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[1.4rem] bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] p-5 ring-1 ring-line">
      <p className="text-[13px] text-text-3">{label}</p>
      <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-text">{value}</p>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, step = 1 }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-2">{label}</span>
      <span className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          className={`${inputClass} tabular pr-12`}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-text-3">{suffix}</span>}
      </span>
    </label>
  );
}

export function RevenueDashboard({ finance }: { finance: SiteSettings["finance"] }) {
  const toast = useToast();
  const [preset, setPreset] = useState<Preset>("30d");
  const [range, setRange] = useState(() => rangeFor("30d"));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Paramètres financiers (enregistrables)
  const [foodCostPct, setFoodCostPct] = useState(finance.foodCostPct);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(finance.fixedCosts);
  const [savingFinance, setSavingFinance] = useState(false);

  // Simulateur
  const [simOrders, setSimOrders] = useState<number | null>(null);
  const [simTicket, setSimTicket] = useState<number | null>(null);
  const [simDays, setSimDays] = useState(30);

  // Recharge à chaque changement de période ; l'ancien rendu reste affiché (atténué) pendant le chargement.
  useEffect(() => {
    let cancelled = false;
    api<Stats>(`/api/admin/stats?from=${range.from}&to=${range.to}`)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) toast(e instanceof Error ? e.message : "Chargement impossible", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, toast]);

  const changeRange = (next: { from: string; to: string }) => {
    if (next.from === range.from && next.to === range.to) return;
    setLoading(true);
    setRange(next);
  };

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") changeRange(rangeFor(p));
  };

  const days = daysIn(range.from, range.to);
  const s = stats?.summary;
  const monthlyFixed = fixedCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

  const profit = useMemo(() => {
    if (!s) return null;
    const cogs = s.costKnown + (s.revenueWithoutCost * foodCostPct) / 100;
    const gross = s.revenue - cogs;
    const fixed = (monthlyFixed * days) / 30.44;
    const net = gross - fixed;
    const coverage = s.revenueWithCost + s.revenueWithoutCost > 0 ? (s.revenueWithCost / (s.revenueWithCost + s.revenueWithoutCost)) * 100 : 0;
    return { cogs, gross, fixed, net, coverage, margin: s.revenue > 0 ? (net / s.revenue) * 100 : 0 };
  }, [s, foodCostPct, monthlyFixed, days]);

  // Valeurs par défaut du simulateur : moyennes réelles de la période
  const avgOrdersPerDay = s ? s.orders / days : 0;
  const ordersPerDay = simOrders ?? Math.round(avgOrdersPerDay * 10) / 10;
  const ticket = simTicket ?? Math.round(s?.averageTicket ?? 0);
  const grossRate = profit && s && s.revenue > 0 ? profit.gross / s.revenue : 1 - foodCostPct / 100;
  const simRevenue = ordersPerDay * ticket * simDays;
  const simGross = simRevenue * grossRate;
  const simNet = simGross - monthlyFixed;
  const breakEven = ticket > 0 && grossRate > 0 ? monthlyFixed / (simDays * ticket * grossRate) : 0;

  const saveFinance = async () => {
    setSavingFinance(true);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        json: { finance: { foodCostPct, fixedCosts: fixedCosts.filter((c) => c.label.trim() || c.amount) } },
      });
      toast("Paramètres financiers enregistrés");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible", "error");
    } finally {
      setSavingFinance(false);
    }
  };

  const dayData = (stats?.byDay ?? []).map((d) => ({
    key: d.day,
    label: formatDay(`${d.day}T12:00:00Z`, { weekday: "short", day: "numeric", month: "short" }),
    tickLabel: formatDay(`${d.day}T12:00:00Z`, { day: "numeric", month: days > 31 ? "short" : undefined }),
    value: d.revenue,
  }));
  const hourData = (stats?.byHour ?? []).map((h) => ({ key: String(h.hour), label: `${h.hour} h - ${h.hour + 1} h`, tickLabel: `${h.hour}h`, value: h.orders }));
  const peak = stats?.byHour.reduce((best, h) => (h.orders > best.orders ? h : best), { hour: 0, orders: 0, revenue: 0 });
  const acceptance = s && s.orders + s.rejected > 0 ? (s.orders / (s.orders + s.rejected)) * 100 : null;

  return (
    <>
      <PageHeader
        title="Revenus"
        sub="Chiffre d'affaires des commandes acceptées sur le site, marges et projections."
        actions={
          <a href={`/api/admin/export?from=${range.from}&to=${range.to}`} className="btn-ghost inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px]">
            <DownloadSimpleIcon size={16} weight="light" /> Export CSV
          </a>
        }
      />

      {/* Filtres : une seule rangée au-dessus de tout */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => choose(p.key)}
            aria-pressed={preset === p.key}
            className={`h-9 rounded-full px-4 text-[13px] ${preset === p.key ? "btn-gold font-medium" : "btn-ghost"}`}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={`${inputClass} h-9 w-auto rounded-full py-1`}
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && changeRange({ ...range, from: e.target.value })}
              aria-label="Date de début"
            />
            <span className="text-text-3">au</span>
            <input
              type="date"
              className={`${inputClass} h-9 w-auto rounded-full py-1`}
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && changeRange({ ...range, to: e.target.value })}
              aria-label="Date de fin"
            />
          </div>
        )}
      </div>

      {!stats ? (
        <div className="grid gap-5">
          <div className="skeleton h-40 rounded-[1.75rem]" />
          <div className="skeleton h-72 rounded-[1.75rem]" />
        </div>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity duration-300 ${loading ? "opacity-55" : ""}`}>
          {/* Chiffre d'affaires + indicateurs */}
          <div className="grid gap-5 lg:grid-cols-[1.3fr_2fr]">
            <Panel>
              <p className="text-[13px] text-text-3">
                Chiffre d&apos;affaires · {range.from === range.to ? formatDay(`${range.from}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" }) : `${days} jours`}
              </p>
              <p className="mt-3 text-[clamp(2.8rem,5vw,3.6rem)] font-semibold leading-none tracking-tight text-gold-100">{formatDA(s!.revenue)}</p>
              <div className="mt-3">
                <Delta current={s!.revenue} previous={stats.previous.revenue} />
              </div>
              <p className="mt-5 text-[12px] leading-relaxed text-text-3">
                Commandes confirmées, en préparation, prêtes ou terminées. Les commandes en attente ({s!.pending}) et refusées ({s!.rejected}) ne sont pas comptées.
              </p>
            </Panel>
            <div className="grid grid-cols-2 gap-4">
              <StatTile label="Commandes" value={formatNumber(s!.orders)} sub={<Delta current={s!.orders} previous={stats.previous.orders} />} />
              <StatTile label="Panier moyen" value={formatDA(s!.averageTicket)} sub={<span className="text-[12px] text-text-3">par commande acceptée</span>} />
              <StatTile label="Articles vendus" value={formatNumber(s!.itemsSold)} sub={<span className="text-[12px] text-text-3">{s!.orders ? formatNumber(s!.itemsSold / s!.orders, 1) : 0} par commande</span>} />
              <StatTile
                label="Taux d'acceptation"
                value={acceptance == null ? "-" : formatPercent(acceptance)}
                sub={<span className="text-[12px] text-text-3">{s!.rejected} refusée(s) ou annulée(s)</span>}
              />
            </div>
          </div>

          {/* CA par jour */}
          <Panel>
            <PanelTitle
              sub={days === 1 ? "Une seule journée : voir aussi les heures de pointe ci-dessous." : "Survolez une colonne pour le détail."}
              action={
                <Button size="sm" variant="subtle" onClick={() => setShowTable((v) => !v)} icon={<TableIcon size={15} weight="light" />}>
                  {showTable ? "Graphique" : "Tableau"}
                </Button>
              }
            >
              Chiffre d&apos;affaires par jour
            </PanelTitle>
            {showTable ? (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-surface text-left text-text-3">
                    <tr>
                      <th className="py-2 font-normal">Jour</th>
                      <th className="py-2 text-right font-normal">Commandes</th>
                      <th className="py-2 text-right font-normal">Chiffre d&apos;affaires</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {stats.byDay.map((d) => (
                      <tr key={d.day} className="border-t border-line">
                        <td className="py-2 text-text-2">{formatDay(`${d.day}T12:00:00Z`, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className="py-2 text-right text-text-2">{d.orders}</td>
                        <td className="py-2 text-right text-text">{formatDA(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ColumnChart data={dayData} format={formatDA} ariaLabel="Chiffre d'affaires par jour" showTickEvery={Math.max(1, Math.ceil(dayData.length / 12))} />
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <PanelTitle sub={peak && peak.orders > 0 ? `Pic d'activité vers ${peak.hour} h` : "Nombre de commandes par heure"}>Heures de pointe</PanelTitle>
              <ColumnChart data={hourData} format={(n) => `${formatNumber(n)} commande(s)`} emphasis="max" ariaLabel="Commandes par heure" showTickEvery={3} height={200} />
            </Panel>
            <Panel>
              <PanelTitle sub="Part du chiffre d'affaires">Mode de commande</PanelTitle>
              <StackedShare
                format={formatDA}
                parts={(["pickup", "delivery", "dine_in"] as OrderType[]).map((type, i) => ({
                  key: type,
                  label: ORDER_TYPE_LABELS[type],
                  value: stats.byType.find((t) => t.type === type)?.revenue ?? 0,
                  color: SERIES[i],
                }))}
              />
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-4 text-[13px] text-text-3">Par catégorie</p>
                <BarList
                  rows={stats.byCategory.slice(0, 8).map((c) => ({ key: c.category, label: c.category, value: c.revenue }))}
                  format={formatDA}
                  empty={<p className="text-[13px] text-text-3">Aucune vente sur la période.</p>}
                />
              </div>
            </Panel>
          </div>

          {/* Meilleures ventes */}
          <Panel>
            <PanelTitle sub="Classées par chiffre d'affaires">Meilleures ventes</PanelTitle>
            {stats.topItems.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-text-3">Aucune vente sur la période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead className="text-left text-text-3">
                    <tr>
                      <th className="pb-3 font-normal">Article</th>
                      <th className="pb-3 text-right font-normal">Quantité</th>
                      <th className="pb-3 text-right font-normal">Chiffre d&apos;affaires</th>
                      <th className="pb-3 text-right font-normal">Marge</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {stats.topItems.map((item) => (
                      <tr key={item.name} className="border-t border-line">
                        <td className="py-2.5 text-text">{item.name}</td>
                        <td className="py-2.5 text-right text-text-2">{item.quantity}</td>
                        <td className="py-2.5 text-right text-text">{formatDA(item.revenue)}</td>
                        <td className="py-2.5 text-right text-text-2">
                          {item.cost != null && item.revenue > 0 ? formatPercent(((item.revenue - item.cost) / item.revenue) * 100) : <span className="text-text-3">coût ?</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Calculateur de bénéfice */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <PanelTitle sub={`Estimation sur ${days} jour(s), charges fixes au prorata.`}>
                <span className="inline-flex items-center gap-2">
                  <CalculatorIcon size={22} weight="light" className="text-gold-300" /> Calculateur de bénéfice
                </span>
              </PanelTitle>
              {profit && (
                <dl className="flex flex-col gap-2.5 text-[14px]">
                  <div className="flex justify-between">
                    <dt className="text-text-2">Chiffre d&apos;affaires</dt>
                    <dd className="tabular text-text">{formatDA(s!.revenue)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-2">
                      Coût des marchandises
                      <span className="block text-[11px] text-text-3">
                        {formatPercent(profit.coverage)} du CA avec prix de revient réel, {foodCostPct} % estimé pour le reste
                      </span>
                    </dt>
                    <dd className="tabular text-text">- {formatDA(profit.cogs)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-2.5">
                    <dt className="text-text">Marge brute</dt>
                    <dd className="tabular text-text">{formatDA(profit.gross)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-2">
                      Charges fixes
                      <span className="block text-[11px] text-text-3">
                        {formatDA(monthlyFixed)} par mois × {days} j
                      </span>
                    </dt>
                    <dd className="tabular text-text">- {formatDA(profit.fixed)}</dd>
                  </div>
                  <div className="mt-2 flex items-end justify-between rounded-2xl bg-bg/50 px-4 py-4 ring-1 ring-line-strong">
                    <dt>
                      <span className="text-text">Résultat estimé</span>
                      <span className="block text-[12px] text-text-3">{formatPercent(profit.margin, 1)} du chiffre d&apos;affaires</span>
                    </dt>
                    <dd className={`text-[1.9rem] font-semibold leading-none ${profit.net >= 0 ? "text-success" : "text-danger"}`}>
                      {profit.net >= 0 ? "" : "- "}
                      {formatDA(Math.abs(profit.net))}
                    </dd>
                  </div>
                </dl>
              )}
              <div className="mt-6 border-t border-line pt-5">
                <NumberField label="Coût matières estimé (articles sans prix de revient)" value={foodCostPct} onChange={(n) => setFoodCostPct(Math.min(100, n))} suffix="%" />
                <p className="mb-2 mt-5 text-[12px] font-medium text-text-2">Charges fixes mensuelles</p>
                <ul className="flex flex-col gap-2">
                  {fixedCosts.map((c, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={c.label}
                        maxLength={60}
                        placeholder="Libellé"
                        aria-label={`Libellé de la charge ${i + 1}`}
                        onChange={(e) => setFixedCosts((list) => list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      />
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} tabular max-w-[150px]`}
                        value={c.amount}
                        aria-label={`Montant de la charge ${i + 1}`}
                        onChange={(e) => setFixedCosts((list) => list.map((x, j) => (j === i ? { ...x, amount: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x)))}
                      />
                      <IconButton label="Supprimer la charge" tone="danger" onClick={() => setFixedCosts((list) => list.filter((_, j) => j !== i))}>
                        <TrashIcon size={15} weight="light" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Button size="sm" icon={<PlusIcon size={14} />} onClick={() => setFixedCosts((list) => [...list, { label: "", amount: 0 }])}>
                    Ajouter une charge
                  </Button>
                  <Button size="sm" variant="gold" loading={savingFinance} onClick={saveFinance} icon={<FloppyDiskIcon size={15} />}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelTitle sub="Pré-rempli avec vos moyennes réelles de la période. Modifiez pour simuler.">Projection mensuelle</PanelTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField label="Commandes par jour" value={ordersPerDay} onChange={setSimOrders} step={0.5} />
                <NumberField label="Panier moyen" value={ticket} onChange={setSimTicket} suffix="DA" step={50} />
                <NumberField label="Jours ouverts / mois" value={simDays} onChange={(n) => setSimDays(Math.min(31, Math.max(1, Math.round(n))))} />
              </div>
              {(simOrders !== null || simTicket !== null) && (
                <button
                  type="button"
                  className="mt-2 text-[12px] text-gold-300 underline-offset-4 hover:underline"
                  onClick={() => {
                    setSimOrders(null);
                    setSimTicket(null);
                  }}
                >
                  Revenir aux moyennes réelles
                </button>
              )}
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-line">
                  <dt className="text-[12px] text-text-3">Chiffre d&apos;affaires mensuel</dt>
                  <dd className="mt-1 text-2xl font-semibold text-text">{formatDA(simRevenue)}</dd>
                </div>
                <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-line">
                  <dt className="text-[12px] text-text-3">Marge brute ({formatPercent(grossRate * 100)})</dt>
                  <dd className="mt-1 text-2xl font-semibold text-text">{formatDA(simGross)}</dd>
                </div>
                <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-line">
                  <dt className="text-[12px] text-text-3">Bénéfice mensuel estimé</dt>
                  <dd className={`mt-1 text-2xl font-semibold ${simNet >= 0 ? "text-success" : "text-danger"}`}>
                    {simNet >= 0 ? "" : "- "}
                    {formatDA(Math.abs(simNet))}
                  </dd>
                </div>
                <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-line">
                  <dt className="text-[12px] text-text-3">Seuil de rentabilité</dt>
                  <dd className="mt-1 text-2xl font-semibold text-text">
                    {breakEven > 0 ? `${formatNumber(Math.ceil(breakEven * 10) / 10, 1)} cmd/jour` : "-"}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-[12px] leading-relaxed text-text-3">
                Le seuil de rentabilité est le nombre de commandes par jour nécessaire pour couvrir vos charges fixes ({formatDA(monthlyFixed)} par mois)
                avec le panier moyen et la marge indiqués.
              </p>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
