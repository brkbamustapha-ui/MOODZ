"use client";

import {
  ArrowCounterClockwiseIcon,
  BagIcon,
  CheckIcon,
  ClockIcon,
  CookingPotIcon,
  ForkKnifeIcon,
  MapPinIcon,
  MopedIcon,
  NoteIcon,
  PhoneIcon,
  PrinterIcon,
  WhatsappLogoIcon,
  XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatDA, formatDateTime, formatTime, timeAgo } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type OrderType } from "@/lib/site-config";
import type { Order } from "@/lib/types";
import { whatsappLink } from "@/components/site/Infos";
import { Badge, Button, IconButton, Modal } from "./ui";

export const TYPE_ICONS: Record<OrderType, typeof BagIcon> = {
  pickup: BagIcon,
  delivery: MopedIcon,
  dine_in: ForkKnifeIcon,
};

export const STATUS_TONE: Record<OrderStatus, "gold" | "info" | "success" | "danger" | "neutral" | "warning"> = {
  pending: "warning",
  confirmed: "gold",
  preparing: "info",
  ready: "success",
  completed: "neutral",
  rejected: "danger",
  cancelled: "danger",
};

const REJECT_REASONS = ["Rupture de stock", "Trop de commandes en cours", "Hors zone de livraison", "Client injoignable", "Restaurant fermé"];
const ETAS = [15, 20, 30, 45, 60];

type Update = (order: Order, status: OrderStatus, extra?: { etaMinutes?: number | null; rejectReason?: string }) => Promise<void>;

function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

export function OrderCard({
  order,
  onUpdate,
  onPrint,
  defaultEta,
  compact,
}: {
  order: Order;
  onUpdate: Update;
  onPrint: (order: Order) => void;
  defaultEta: number;
  compact?: boolean;
}) {
  const now = useNow();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [eta, setEta] = useState(ETAS.includes(defaultEta) ? defaultEta : 30);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const TypeIcon = TYPE_ICONS[order.orderType];
  const minutes = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
  const late = order.status === "pending" && minutes >= 5;

  const run = async (status: OrderStatus, extra?: { etaMinutes?: number | null; rejectReason?: string }) => {
    setBusy(status);
    try {
      await onUpdate(order, status, extra);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={`relative overflow-hidden rounded-[1.4rem] bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] p-5 ring-1 ${
        order.status === "pending"
          ? "ring-[color-mix(in_oklab,var(--accent)_45%,transparent)] shadow-[0_20px_50px_-30px_color-mix(in_oklab,var(--accent)_70%,transparent)]"
          : "ring-line"
      }`}
    >
      {order.status === "pending" && (
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--gold-300),transparent)]" />
      )}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular font-mono text-[15px] tracking-wide text-gold-200">{order.code}</span>
            <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          </div>
          <p className={`mt-1 flex items-center gap-1.5 text-[12px] ${late ? "text-warning" : "text-text-3"}`}>
            <ClockIcon size={13} />
            {formatTime(order.createdAt)} · {timeAgo(order.createdAt, now)}
            {late && " · à traiter"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/4 px-3 py-1.5 text-[12px] text-text-2 ring-1 ring-line">
          <TypeIcon size={15} weight="light" className="text-gold-300" />
          {ORDER_TYPE_LABELS[order.orderType]}
        </span>
      </header>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-text">{order.customerName}</p>
          <a href={`tel:${order.customerPhone}`} className="tabular text-[13px] text-text-2 hover:text-gold-200">
            {order.customerPhone}
          </a>
        </div>
        <div className="flex gap-1.5">
          <a href={`tel:${order.customerPhone}`} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full" aria-label={`Appeler ${order.customerName}`}>
            <PhoneIcon size={16} weight="light" />
          </a>
          <a
            href={whatsappLink(order.customerPhone, `Bonjour ${order.customerName.split(" ")[0]}, MOODZ au sujet de votre commande ${order.code}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost flex h-9 w-9 items-center justify-center rounded-full"
            aria-label={`WhatsApp ${order.customerName}`}
          >
            <WhatsappLogoIcon size={16} weight="light" />
          </a>
        </div>
      </div>

      {(order.address || order.tableNumber || (order.scheduledFor && order.scheduledFor !== "asap")) && (
        <div className="mt-3 space-y-1.5 text-[13px] text-text-2">
          {order.address && (
            <p className="flex gap-2">
              <MapPinIcon size={15} className="mt-0.5 shrink-0 text-gold-300" />
              {order.address}
            </p>
          )}
          {order.tableNumber && (
            <p className="flex gap-2">
              <ForkKnifeIcon size={15} className="mt-0.5 shrink-0 text-gold-300" /> Table {order.tableNumber}
            </p>
          )}
          {order.scheduledFor && order.scheduledFor !== "asap" && (
            <p className="flex gap-2 text-warning">
              <ClockIcon size={15} className="mt-0.5 shrink-0" /> Pour {order.scheduledFor}
            </p>
          )}
        </div>
      )}

      {!compact && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-[14px]">
              <span className="text-text">
                <span className="tabular mr-1.5 font-semibold text-gold-300">{item.quantity}×</span>
                {item.name}
                {item.variant && <span className="text-text-3"> ({item.variant})</span>}
              </span>
              <span className="tabular text-text-3">{formatDA(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      {order.notes && (
        <p className="mt-3 flex gap-2 rounded-xl bg-warning/8 px-3 py-2 text-[13px] text-warning ring-1 ring-warning/25">
          <NoteIcon size={15} className="mt-0.5 shrink-0" />
          {order.notes}
        </p>
      )}
      {order.rejectReason && (order.status === "rejected" || order.status === "cancelled") && (
        <p className="mt-3 text-[13px] text-danger">Motif : {order.rejectReason}</p>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-[12px] text-text-3">
          {order.deliveryFee > 0 ? `dont livraison ${formatDA(order.deliveryFee)}` : `${order.items.reduce((n, i) => n + i.quantity, 0)} article(s)`}
        </span>
        <span className="font-display text-2xl text-gold-100">{formatDA(order.total)}</span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-2">
        {order.status === "pending" && (
          <>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Délai estimé">
              <span className="mr-1 text-[12px] text-text-3">Prête dans</span>
              {ETAS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={eta === m}
                  onClick={() => setEta(m)}
                  className={`tabular h-8 rounded-full px-2.5 text-[12px] transition-colors ${eta === m ? "btn-gold font-semibold" : "text-text-2 ring-1 ring-line-strong hover:text-text"}`}
                >
                  {m}&apos;
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="gold" className="flex-1" loading={busy === "confirmed"} onClick={() => run("confirmed", { etaMinutes: eta })} icon={<CheckIcon size={16} weight="bold" />}>
                Confirmer
              </Button>
              <Button variant="danger" onClick={() => setRejecting(true)} icon={<XIcon size={15} />}>
                Refuser
              </Button>
            </div>
          </>
        )}
        {order.status === "confirmed" && (
          <div className="flex gap-2">
            <Button variant="gold" className="flex-1" loading={busy === "preparing"} onClick={() => run("preparing")} icon={<CookingPotIcon size={16} />}>
              En préparation
            </Button>
            <Button loading={busy === "ready"} onClick={() => run("ready")}>
              Prête
            </Button>
          </div>
        )}
        {order.status === "preparing" && (
          <Button variant="gold" loading={busy === "ready"} onClick={() => run("ready")} icon={<CheckIcon size={16} weight="bold" />}>
            {order.orderType === "delivery" ? "Partie en livraison" : "Prête"}
          </Button>
        )}
        {order.status === "ready" && (
          <Button variant="gold" loading={busy === "completed"} onClick={() => run("completed")} icon={<CheckIcon size={16} weight="bold" />}>
            {order.orderType === "delivery" ? "Livrée" : order.orderType === "dine_in" ? "Servie" : "Récupérée"}
          </Button>
        )}
        {(order.status === "rejected" || order.status === "cancelled") && (
          <Button size="sm" onClick={() => run("pending")} loading={busy === "pending"} icon={<ArrowCounterClockwiseIcon size={14} />}>
            Rouvrir la commande
          </Button>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-3">#{order.id} · {formatDateTime(order.createdAt)}</span>
          <div className="flex gap-1">
            {order.status === "confirmed" && (
              <IconButton label="Annuler la confirmation" tone="subtle" onClick={() => run("pending")}>
                <ArrowCounterClockwiseIcon size={15} />
              </IconButton>
            )}
            {["confirmed", "preparing", "ready"].includes(order.status) && (
              <IconButton label="Annuler la commande" tone="danger" onClick={() => setRejecting(true)}>
                <XIcon size={15} />
              </IconButton>
            )}
            <IconButton label="Imprimer le ticket" tone="subtle" onClick={() => onPrint(order)}>
              <PrinterIcon size={16} weight="light" />
            </IconButton>
          </div>
        </div>
      </div>

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={order.status === "pending" ? "Refuser la commande" : "Annuler la commande"}
        footer={
          <>
            <Button onClick={() => setRejecting(false)}>Retour</Button>
            <Button
              variant="danger"
              loading={busy === "rejected" || busy === "cancelled"}
              onClick={async () => {
                await run(order.status === "pending" ? "rejected" : "cancelled", { rejectReason: reason });
                setRejecting(false);
              }}
            >
              Confirmer le refus
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-text-2">
          Le client verra le motif sur sa page de suivi. Pensez à le prévenir par téléphone si possible.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`h-9 rounded-full px-3.5 text-[13px] ${reason === r ? "btn-gold font-medium" : "btn-ghost"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-[12px] font-medium text-text-2" htmlFor={`reason-${order.id}`}>
          Motif
        </label>
        <input
          id={`reason-${order.id}`}
          className="mt-1.5 w-full rounded-xl bg-bg/70 px-3.5 py-2.5 text-[14px] text-text shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none focus:shadow-[inset_0_0_0_1px_var(--gold-400)]"
          value={reason}
          maxLength={200}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </motion.article>
  );
}

/** Ticket de caisse imprimable (80 mm). */
export function PrintTicket({ order, restaurant }: { order: Order | null; restaurant: string }) {
  if (!order) return null;
  return (
    <div className="print-area print-only">
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 16 }}>{restaurant}</div>
      <div style={{ textAlign: "center" }}>{formatDateTime(order.createdAt)}</div>
      <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700, margin: "6px 0" }}>{order.code}</div>
      <div>
        {ORDER_TYPE_LABELS[order.orderType]}
        {order.tableNumber ? ` - Table ${order.tableNumber}` : ""}
        {order.scheduledFor && order.scheduledFor !== "asap" ? ` - Pour ${order.scheduledFor}` : ""}
      </div>
      <div>
        {order.customerName} - {order.customerPhone}
      </div>
      {order.address && <div>{order.address}</div>}
      <hr />
      {order.items.map((i) => (
        <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>
            {i.quantity} x {i.name}
            {i.variant ? ` (${i.variant})` : ""}
          </span>
          <span>{formatDA(i.lineTotal)}</span>
        </div>
      ))}
      <hr />
      {order.deliveryFee > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Livraison</span>
          <span>{formatDA(order.deliveryFee)}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
        <span>TOTAL</span>
        <span>{formatDA(order.total)}</span>
      </div>
      {order.notes && <div style={{ marginTop: 6 }}>Note : {order.notes}</div>}
      <div style={{ textAlign: "center", marginTop: 10 }}>Merci et à bientôt !</div>
    </div>
  );
}
