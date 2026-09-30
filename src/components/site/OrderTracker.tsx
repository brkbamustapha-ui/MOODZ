"use client";

import {
  ArrowLeftIcon,
  BellRingingIcon,
  CheckIcon,
  CookingPotIcon,
  HourglassMediumIcon,
  PhoneIcon,
  SealCheckIcon,
  WhatsappLogoIcon,
  XCircleIcon,
  type Icon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { formatDA, formatTime } from "@/lib/format";
import { ORDER_TYPE_LABELS, type OrderStatus, type OrderType, type PublicSettings } from "@/lib/site-config";
import type { PublicOrder } from "@/lib/types";
import { whatsappLink } from "./Infos";

const EASE = [0.16, 1, 0.3, 1] as const;
const FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed"];

function stepLabel(status: OrderStatus, type: OrderType): string {
  switch (status) {
    case "pending":
      return "Reçue";
    case "confirmed":
      return "Confirmée";
    case "preparing":
      return "En préparation";
    case "ready":
      return type === "delivery" ? "En livraison" : type === "dine_in" ? "Prête à servir" : "Prête";
    case "completed":
      return type === "delivery" ? "Livrée" : type === "dine_in" ? "Servie" : "Récupérée";
    default:
      return "";
  }
}

const HEADLINES: Record<OrderStatus, { title: string; text: string; icon: Icon }> = {
  pending: {
    title: "En attente de confirmation",
    text: "Notre équipe vérifie votre commande. Vous serez peut-être appelé pour la confirmer.",
    icon: HourglassMediumIcon,
  },
  confirmed: { title: "Commande confirmée", text: "C'est validé, nous nous en occupons.", icon: SealCheckIcon },
  preparing: { title: "En préparation", text: "En cuisine, avec soin.", icon: CookingPotIcon },
  ready: { title: "Votre commande est prête", text: "", icon: BellRingingIcon },
  completed: { title: "Bonne dégustation !", text: "Merci d'avoir commandé chez nous. À très vite.", icon: CheckIcon },
  rejected: { title: "Commande refusée", text: "Nous ne pouvons pas honorer cette commande.", icon: XCircleIcon },
  cancelled: { title: "Commande annulée", text: "Cette commande a été annulée.", icon: XCircleIcon },
};

const READY_TEXT: Record<OrderType, string> = {
  pickup: "Elle vous attend au comptoir.",
  delivery: "Notre livreur est en route.",
  dine_in: "Elle arrive à votre table.",
};

export function OrderTracker({ initial, settings }: { initial: PublicOrder; settings: PublicSettings }) {
  const [order, setOrder] = useState(initial);
  const final = order.status === "completed" || order.status === "rejected" || order.status === "cancelled";

  useEffect(() => {
    if (final) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${order.code}`, { cache: "no-store" });
        if (res.ok && !stopped) setOrder(await res.json());
      } catch {}
    };
    const id = window.setInterval(tick, 8000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [order.code, final]);

  const headline = HEADLINES[order.status];
  const HeadIcon = headline.icon;
  const failed = order.status === "rejected" || order.status === "cancelled";
  const reached = FLOW.indexOf(order.status);
  const eta =
    order.confirmedAt && order.etaMinutes && !final
      ? formatTime(new Date(new Date(order.confirmedAt).getTime() + order.etaMinutes * 60_000))
      : null;

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 pb-20 pt-8">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[60vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)] blur-2xl" />

      <div className="relative mx-auto flex max-w-2xl items-center justify-between">
        <Link href="/" className="btn-ghost inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px]">
          <ArrowLeftIcon size={16} weight="light" /> La carte
        </Link>
        <Link href="/" aria-label="Accueil MOODZ">
          <BrandLogo src={settings.logoDataUrl} alt={settings.restaurantName} className="h-14 w-14" imageClassName="h-10 w-auto object-contain" />
        </Link>
      </div>

      <div className="relative mx-auto mt-14 max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={order.status}
              className={`flex h-24 w-24 items-center justify-center rounded-full ${failed ? "bg-danger/10 text-danger ring-1 ring-danger/40" : "btn-gold"}`}
              initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
            >
              <HeadIcon size={40} weight={failed ? "light" : "regular"} className={order.status === "pending" ? "animate-pulse" : ""} />
            </motion.span>
          </AnimatePresence>
          {order.firstName && !failed && <p className="mt-8 font-display text-xl italic text-gold-200">Merci {order.firstName}</p>}
          <p className={`${order.firstName && !failed ? "mt-2" : "mt-8"} text-[12px] uppercase tracking-[0.24em] text-text-3`}>
            Commande <span className="tabular font-mono tracking-wider text-gold-200">{order.code}</span>
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={order.status}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,3.4rem)] font-medium leading-[1.05] text-text">
                {headline.title}
              </h1>
              <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-relaxed text-text-2">
                {order.status === "ready" ? READY_TEXT[order.orderType] : headline.text}
                {order.status === "rejected" && order.rejectReason ? ` Motif : ${order.rejectReason}.` : ""}
              </p>
              {eta && (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] text-gold-100 ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]">
                  Prévue vers <span className="tabular font-semibold">{eta}</span>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {!failed && (
          <ol className="mt-14 grid grid-cols-5 gap-1" aria-label="Avancement de la commande">
            {FLOW.map((step, i) => {
              const done = i <= reached;
              const current = i === reached;
              return (
                <li key={step} className="flex flex-col items-center gap-3 text-center">
                  <span className="relative flex w-full items-center">
                    <span className={`h-px flex-1 ${i === 0 ? "opacity-0" : done ? "bg-gold-400" : "bg-line-strong"}`} />
                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] transition-all duration-700 ${
                        done ? "btn-gold" : "bg-surface-2 text-text-3 ring-1 ring-line-strong"
                      }`}
                    >
                      {current && !final && <span className="absolute inset-0 animate-ping rounded-full bg-gold-300/30" />}
                      {done ? <CheckIcon size={15} weight="bold" /> : i + 1}
                    </span>
                    <span className={`h-px flex-1 ${i === FLOW.length - 1 ? "opacity-0" : i < reached ? "bg-gold-400" : "bg-line-strong"}`} />
                  </span>
                  <span className={`text-[11px] leading-tight sm:text-[12px] ${current ? "font-medium text-gold-100" : done ? "text-text-2" : "text-text-3"}`}>
                    {stepLabel(step, order.orderType)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="bezel mt-14">
          <div className="bezel-core p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-text-3">
              <span>
                {ORDER_TYPE_LABELS[order.orderType]}
                {order.tableNumber ? `, table ${order.tableNumber}` : ""}
              </span>
              <span>
                Passée à <span className="tabular">{formatTime(order.createdAt)}</span>
                {order.scheduledFor && order.scheduledFor !== "asap" ? `, pour ${order.scheduledFor}` : ""}
              </span>
            </div>
            <ul className="mt-5 divide-y divide-line">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-[15px] text-text">
                    <span className="tabular mr-2 text-gold-300">{item.quantity}×</span>
                    {item.name}
                    {item.variant && <span className="text-text-3"> ({item.variant})</span>}
                  </span>
                  <span className="tabular text-[15px] text-text-2">{formatDA(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[14px]">
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-text-3">
                  <dt>Livraison</dt>
                  <dd className="tabular">{formatDA(order.deliveryFee)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <dt className="text-text">Total</dt>
                <dd className="tabular font-display text-3xl text-gold-100">{formatDA(order.total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {(settings.phone || settings.whatsapp) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {settings.phone && (
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px]">
                <PhoneIcon size={17} weight="light" className="text-gold-300" /> Appeler le restaurant
              </a>
            )}
            {settings.whatsapp && (
              <a
                href={whatsappLink(settings.whatsapp, `Bonjour, à propos de ma commande ${order.code}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px]"
              >
                <WhatsappLogoIcon size={17} weight="light" className="text-gold-300" /> WhatsApp
              </a>
            )}
          </div>
        )}
        {!final && (
          <p className="mt-8 text-center text-[12px] text-text-3">Cette page se met à jour automatiquement.</p>
        )}
      </div>
    </main>
  );
}
