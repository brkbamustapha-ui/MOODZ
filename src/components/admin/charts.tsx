"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

/** Palette catégorielle validée (scripts/validate_palette.js, mode sombre, surface #15130F). */
export const SERIES = ["#B08A3A", "#4C86D9", "#C45C7C"] as const;

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
export const formatCompact = (n: number) => compact.format(n);

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Colonne avec extrémité arrondie de 4 px et base carrée. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

type Tip = { x: number; y: number; title: string; value: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-[rgb(12_11_9/0.94)] px-3 py-2 text-center shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] ring-1 ring-line-strong"
      style={{ left: tip.x, top: tip.y - 10 }}
      role="status"
    >
      <p className="whitespace-nowrap text-[14px] font-semibold text-text">{tip.value}</p>
      <p className="whitespace-nowrap text-[11px] text-text-3">{tip.title}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Histogramme en colonnes (une série)                                 */
/* ------------------------------------------------------------------ */

export type ColumnDatum = { key: string; label: string; tickLabel?: string; value: number };

export function ColumnChart({
  data,
  height = 220,
  format,
  emphasis = "all",
  ariaLabel,
  showTickEvery = 1,
}: {
  data: ColumnDatum[];
  height?: number;
  format: (n: number) => string;
  /** "all" : toutes les colonnes en or ; "max" : seule la plus haute est mise en avant */
  emphasis?: "all" | "max";
  ariaLabel: string;
  showTickEvery?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const axisW = 44;
  const bottom = 26;
  const plotW = Math.max(0, width - axisW);
  const plotH = height - bottom - 18;
  const band = data.length ? plotW / data.length : 0;
  const colW = Math.max(2, Math.min(24, band - 2, band * 0.7));
  const maxIndex = data.findIndex((d) => d.value === max && max > 0);
  const y = (v: number) => 18 + plotH - (v / top) * plotH;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={axisW} x2={width} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={axisW - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--text-3)] text-[11px]">
                {formatCompact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = axisW + i * band + (band - colW) / 2;
            const h = (d.value / top) * plotH;
            const emphasized = emphasis === "all" || i === maxIndex;
            const lifted = hover === i;
            return (
              <g key={d.key}>
                <path
                  d={columnPath(x, y(d.value), colW, h)}
                  fill={emphasized ? "var(--gold-300)" : "color-mix(in oklab, var(--gold-300) 30%, var(--surface-3))"}
                  opacity={hover === null || lifted ? 1 : 0.55}
                  style={{ transition: "opacity 200ms" }}
                />
                {i % showTickEvery === 0 && (
                  <text x={axisW + i * band + band / 2} y={height - 8} textAnchor="middle" className="tabular fill-[var(--text-3)] text-[11px]">
                    {d.tickLabel ?? d.label}
                  </text>
                )}
                {i === maxIndex && (
                  <text x={x + colW / 2} y={y(d.value) - 6} textAnchor="middle" className="fill-[var(--text-2)] text-[11px] font-medium">
                    {formatCompact(d.value)}
                  </text>
                )}
                {/* Zone de survol : toute la hauteur de la bande */}
                <rect
                  x={axisW + i * band}
                  y={0}
                  width={band}
                  height={height - bottom}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label} : ${format(d.value)}`}
                  onPointerEnter={() => {
                    setHover(i);
                    setTip({ x: x + colW / 2, y: y(d.value), title: d.label, value: format(d.value) });
                  }}
                  onPointerLeave={() => {
                    setHover(null);
                    setTip(null);
                  }}
                  onFocus={() => {
                    setHover(i);
                    setTip({ x: x + colW / 2, y: y(d.value), title: d.label, value: format(d.value) });
                  }}
                  onBlur={() => {
                    setHover(null);
                    setTip(null);
                  }}
                  className="outline-none"
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barres horizontales (classement)                                    */
/* ------------------------------------------------------------------ */

export function BarList({ rows, format, empty }: { rows: { key: string; label: string; value: number; note?: string }[]; format: (n: number) => string; empty?: ReactNode }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (rows.length === 0) return <>{empty}</>;
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <li key={row.key} className="group grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_auto]">
          <span className="truncate text-[13px] text-text-2 group-hover:text-text" title={row.label}>
            {row.label}
          </span>
          <span className="relative h-3" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px] bg-gold-300 transition-[filter] duration-200 group-hover:brightness-110"
              style={{ width: `${max ? Math.max(1.5, (row.value / max) * 100) : 0}%` }}
            />
          </span>
          <span className="tabular min-w-[5.5rem] text-right text-[13px] text-text">
            {format(row.value)}
            {row.note && <span className="ml-1.5 text-text-3">{row.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Barre empilée 100 % (répartition)                                   */
/* ------------------------------------------------------------------ */

export function StackedShare({ parts, format }: { parts: { key: string; label: string; value: number; color: string }[]; format: (n: number) => string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const [hover, setHover] = useState<string | null>(null);
  if (total <= 0) return <p className="py-6 text-center text-[13px] text-text-3">Pas encore de données sur la période.</p>;
  const visible = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={visible.map((p) => `${p.label} ${Math.round((p.value / total) * 100)} %`).join(", ")}>
        {visible.map((p) => (
          <span
            key={p.key}
            className="h-full transition-opacity duration-200"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color, opacity: hover && hover !== p.key ? 0.45 : 1 }}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
            title={`${p.label} : ${format(p.value)}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {parts.map((p) => (
          <li
            key={p.key}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 transition-colors ${hover === p.key ? "ring-line-strong" : "ring-transparent"}`}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: p.color }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-text">{p.label}</span>
              <span className="tabular block text-[12px] text-text-3">
                {format(p.value)} · {total ? Math.round((p.value / total) * 100) : 0} %
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
