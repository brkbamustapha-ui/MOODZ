"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagOpenIcon,
  SpinnerGapIcon,
  TrashIcon,
  WhatsappLogoIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDA } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { OpenStatus } from "@/lib/hours";
import { ORDER_TYPE_LABELS, type OrderType, type PublicSettings } from "@/lib/site-config";
import { setScrollLocked, scrollToId } from "../SmoothScroll";
import { whatsappLink } from "../Infos";
import { useCart } from "./CartContext";

const EASE = [0.32, 0.72, 0, 1] as const;
const CUSTOMER_KEY = "moodz-customer-v1";

type Step = "cart" | "checkout" | "done";

type FormState = {
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  address: string;
  tableNumber: string;
  notes: string;
  when: "asap" | "later";
  time: string;
  website: string;
};

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl bg-bg/60 px-4 py-3.5 text-[15px] text-text shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow duration-500 placeholder:text-text-3 focus:shadow-[inset_0_0_0_1px_var(--gold-400)]";

export function CartDrawer({ settings, status }: { settings: PublicSettings; status: OpenStatus }) {
  const cart = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [placed, setPlaced] = useState<{ code: string; total: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const desktop = useMediaQuery("(min-width: 640px)");
  const hiddenPos = desktop ? { x: "100%", y: 0 } : { x: 0, y: "100%" };
  const { ordering } = settings;

  const availableTypes = useMemo(
    () =>
      (["pickup", "delivery", "dine_in"] as OrderType[]).filter(
        (t) => (t === "pickup" && ordering.pickup) || (t === "delivery" && ordering.delivery) || (t === "dine_in" && ordering.dineIn),
      ),
    [ordering],
  );

  const [form, setForm] = useState<FormState>({
    orderType: availableTypes[0] ?? "pickup",
    customerName: "",
    customerPhone: "",
    address: "",
    tableNumber: "",
    notes: "",
    when: "asap",
    time: "",
    website: "",
  });

  /** Pré-remplit les coordonnées mémorisées lors d'une commande précédente (sur cet appareil). */
  const goToCheckout = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        setForm((f) => ({
          ...f,
          customerName: f.customerName || (typeof saved.customerName === "string" ? saved.customerName : ""),
          customerPhone: f.customerPhone || (typeof saved.customerPhone === "string" ? saved.customerPhone : ""),
          address: f.address || (typeof saved.address === "string" ? saved.address : ""),
        }));
      }
    } catch {}
    setStep("checkout");
  };

  const { close: closeCart, isOpen } = cart;
  const closeDrawer = useCallback(() => {
    closeCart();
    // Après une commande envoyée, le prochain affichage repart sur le panier
    setStep((current) => (current === "done" ? "cart" : current));
  }, [closeCart]);

  useEffect(() => {
    setScrollLocked(isOpen);
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeDrawer]);

  const canOrder = ordering.enabled && (status.isOpen || ordering.allowWhenClosed) && availableTypes.length > 0;
  const subtotal = cart.subtotal;
  const isDelivery = form.orderType === "delivery";
  const deliveryFee = isDelivery ? (ordering.freeDeliveryFrom > 0 && subtotal >= ordering.freeDeliveryFrom ? 0 : ordering.deliveryFee) : 0;
  const belowMinimum = isDelivery && subtotal < ordering.minDeliveryOrder;
  const total = subtotal + deliveryFee;
  const hasUnavailable = cart.lines.some((l) => l.unavailable);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (form.customerName.trim().length < 2) next.customerName = "Indiquez votre nom.";
    const digits = form.customerPhone.replace(/[\s.\-()]/g, "");
    if (!/^\+?\d{9,15}$/.test(digits)) next.customerPhone = "Numéro invalide (ex. 0555 12 34 56).";
    if (isDelivery && form.address.trim().length < 6) next.address = "Indiquez l'adresse de livraison.";
    if (form.when === "later" && !/^\d{2}:\d{2}$/.test(form.time)) next.time = "Choisissez une heure.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.lines.filter((l) => !l.unavailable).map((l) => ({ itemId: l.itemId, variant: l.variant, quantity: l.quantity })),
          orderType: form.orderType,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          address: isDelivery ? form.address : "",
          tableNumber: form.orderType === "dine_in" ? form.tableNumber : "",
          notes: form.notes,
          scheduledFor: form.when === "later" ? form.time : "asap",
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "La commande n'a pas pu être envoyée. Réessayez.");
        return;
      }
      try {
        localStorage.setItem(
          CUSTOMER_KEY,
          JSON.stringify({ customerName: form.customerName, customerPhone: form.customerPhone, address: form.address }),
        );
      } catch {}
      cart.rememberOrder(data.code);
      cart.clear();
      setPlaced({ code: data.code, total: data.total });
      setStep("done");
    } catch {
      setServerError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Votre panier">
          <motion.div
            className="absolute inset-0 bg-black/70 pointer-fine:bg-black/60 pointer-fine:backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={closeDrawer}
          />
          <motion.aside
            className="absolute bottom-0 right-0 flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[linear-gradient(180deg,var(--surface-2),var(--bg-2))] shadow-[inset_0_1px_0_rgb(255_240_210/0.08),0_-30px_80px_-20px_rgb(0_0_0/0.8)] ring-1 ring-line sm:top-0 sm:h-full sm:max-w-[460px] sm:rounded-none sm:rounded-l-[2rem]"
            initial={hiddenPos}
            animate={{ x: 0, y: 0 }}
            exit={hiddenPos}
            transition={{ duration: 0.6, ease: EASE }}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-5 sm:pt-7">
              <div className="flex items-center gap-3">
                {step === "checkout" && (
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full"
                    aria-label="Retour au panier"
                  >
                    <ArrowLeftIcon size={17} weight="light" />
                  </button>
                )}
                <h2 className="font-display text-3xl text-text">
                  {step === "cart" ? "Votre panier" : step === "checkout" ? "Vos coordonnées" : "Merci !"}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeDrawer}
                className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full"
                aria-label="Fermer le panier"
              >
                <XIcon size={17} weight="light" />
              </button>
            </div>
            <div className="mx-6 h-px bg-line" />

            <div className="relative flex-1 overflow-y-auto overscroll-contain px-6 py-5" data-lenis-prevent>
              <AnimatePresence mode="wait" initial={false}>
                {step === "cart" && (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    {cart.lines.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] text-gold-300 ring-1 ring-line-strong">
                          <ShoppingBagOpenIcon size={34} weight="thin" />
                        </span>
                        <p className="mt-6 font-display text-2xl text-text">Votre panier est vide</p>
                        <p className="mt-2 max-w-[28ch] text-[14px] text-text-3">Parcourez la carte et ajoutez ce qui vous fait envie.</p>
                        <button
                          type="button"
                          onClick={() => {
                            closeDrawer();
                            window.setTimeout(() => scrollToId("carte"), 350);
                          }}
                          className="btn-gold mt-8 h-12 rounded-full px-7 text-[14px] font-semibold"
                        >
                          Voir la carte
                        </button>
                        {cart.recentOrders.length > 0 && (
                          <div className="mt-12 w-full text-left">
                            <p className="text-[12px] uppercase tracking-[0.18em] text-text-3">Mes commandes récentes</p>
                            <ul className="mt-3 space-y-2">
                              {cart.recentOrders.map((code) => (
                                <li key={code}>
                                  <Link
                                    href={`/commande/${code}`}
                                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-[14px] ring-1 ring-line hover:ring-line-strong"
                                  >
                                    <span className="tabular font-mono text-gold-200">{code}</span>
                                    <span className="text-text-3">Suivre</span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ul className="divide-y divide-line">
                        <AnimatePresence initial={false}>
                          {cart.lines.map((line) => (
                            <motion.li
                              key={line.key}
                              layout
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.4, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-start gap-4 py-4">
                                <div className="min-w-0 flex-1">
                                  <p className={`font-display text-xl leading-tight ${line.unavailable ? "text-text-3 line-through" : "text-text"}`}>
                                    {line.item?.name ?? "Article retiré de la carte"}
                                  </p>
                                  {line.variant && <p className="mt-0.5 text-[13px] text-gold-300">{line.variant}</p>}
                                  {line.unavailable ? (
                                    <p className="mt-1 text-[12px] text-danger">Indisponible, retirez-le pour continuer</p>
                                  ) : (
                                    <p className="tabular mt-1 text-[13px] text-text-3">{formatDA(line.unitPrice)} l&apos;unité</p>
                                  )}
                                  <div className="mt-3 flex items-center gap-2">
                                    <div className="flex items-center rounded-full ring-1 ring-line-strong">
                                      <button
                                        type="button"
                                        onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 hover:text-text"
                                        aria-label={`Retirer un ${line.item?.name ?? "article"}`}
                                      >
                                        <MinusIcon size={14} />
                                      </button>
                                      <span className="tabular w-7 text-center text-[14px]" aria-live="polite">
                                        {line.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                                        disabled={line.unavailable || line.quantity >= 50}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-text-2 hover:text-text disabled:opacity-30"
                                        aria-label={`Ajouter un ${line.item?.name ?? "article"}`}
                                      >
                                        <PlusIcon size={14} />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => cart.remove(line.key)}
                                      className="flex h-9 w-9 items-center justify-center rounded-full text-text-3 hover:text-danger"
                                      aria-label={`Supprimer ${line.item?.name ?? "l'article"}`}
                                    >
                                      <TrashIcon size={16} weight="light" />
                                    </button>
                                  </div>
                                </div>
                                <span className="tabular pt-1 text-[15px] font-medium text-gold-100">
                                  {line.unavailable ? "-" : formatDA(line.lineTotal)}
                                </span>
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </motion.div>
                )}

                {step === "checkout" && (
                  <motion.form
                    key="checkout"
                    id="checkout-form"
                    onSubmit={submit}
                    noValidate
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex flex-col gap-5 pb-4"
                  >
                    <fieldset>
                      <legend className="mb-2 text-[13px] font-medium text-text-2">Mode de commande</legend>
                      <div className="grid gap-1.5 rounded-2xl bg-bg/60 p-1.5 ring-1 ring-line" style={{ gridTemplateColumns: `repeat(${availableTypes.length}, minmax(0, 1fr))` }}>
                        {availableTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={form.orderType === type}
                            onClick={() => set("orderType", type)}
                            className={`h-11 rounded-xl text-[13px] font-medium transition-all duration-500 ${
                              form.orderType === type ? "btn-gold" : "text-text-2 hover:text-text"
                            }`}
                          >
                            {ORDER_TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <Field label="Nom" htmlFor="c-name" error={errors.customerName}>
                      <input
                        id="c-name"
                        className={inputClass}
                        value={form.customerName}
                        onChange={(e) => set("customerName", e.target.value)}
                        autoComplete="name"
                        maxLength={60}
                        placeholder="Votre prénom et nom"
                      />
                    </Field>
                    <Field label="Téléphone" htmlFor="c-phone" hint="Nous vous appelons pour confirmer." error={errors.customerPhone}>
                      <input
                        id="c-phone"
                        className={inputClass}
                        value={form.customerPhone}
                        onChange={(e) => set("customerPhone", e.target.value)}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={20}
                        placeholder="0555 12 34 56"
                      />
                    </Field>
                    {isDelivery && (
                      <Field label="Adresse de livraison" htmlFor="c-address" error={errors.address}>
                        <textarea
                          id="c-address"
                          className={`${inputClass} min-h-[84px] resize-none`}
                          value={form.address}
                          onChange={(e) => set("address", e.target.value)}
                          autoComplete="street-address"
                          maxLength={240}
                          placeholder="Rue, numéro, étage, repère..."
                        />
                      </Field>
                    )}
                    {form.orderType === "dine_in" && (
                      <Field label="Numéro de table (facultatif)" htmlFor="c-table">
                        <input
                          id="c-table"
                          className={inputClass}
                          value={form.tableNumber}
                          onChange={(e) => set("tableNumber", e.target.value)}
                          maxLength={12}
                          inputMode="numeric"
                          placeholder="Ex. 7"
                        />
                      </Field>
                    )}
                    <fieldset>
                      <legend className="mb-2 text-[13px] font-medium text-text-2">Pour quand ?</legend>
                      <div className="flex flex-wrap items-center gap-2">
                        {(["asap", "later"] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            aria-pressed={form.when === w}
                            onClick={() => set("when", w)}
                            className={`h-10 rounded-full px-4 text-[13px] ${form.when === w ? "btn-gold font-medium" : "btn-ghost"}`}
                          >
                            {w === "asap" ? "Dès que possible" : "Choisir une heure"}
                          </button>
                        ))}
                        {form.when === "later" && (
                          <input
                            type="time"
                            aria-label="Heure souhaitée"
                            className={`${inputClass} w-32 py-2`}
                            value={form.time}
                            onChange={(e) => set("time", e.target.value)}
                          />
                        )}
                      </div>
                      {errors.time && <p className="mt-2 text-[12px] text-danger">{errors.time}</p>}
                    </fieldset>
                    <Field label="Remarque (facultatif)" htmlFor="c-notes">
                      <textarea
                        id="c-notes"
                        className={`${inputClass} min-h-[72px] resize-none`}
                        value={form.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        maxLength={400}
                        placeholder="Allergie, sans oignon, sonner à l'interphone..."
                      />
                    </Field>
                    {/* Pot de miel anti-robots : invisible pour les visiteurs */}
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      className="absolute -left-[9999px] h-0 w-0 opacity-0"
                      aria-hidden
                      value={form.website}
                      onChange={(e) => set("website", e.target.value)}
                    />
                    {ordering.notice && (
                      <p className="rounded-2xl bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] px-4 py-3 text-[13px] leading-relaxed text-gold-100 ring-1 ring-[color-mix(in_oklab,var(--accent)_25%,transparent)]">
                        {ordering.notice}
                      </p>
                    )}
                    {serverError && (
                      <p className="rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger ring-1 ring-danger/30" role="alert">
                        {serverError}
                      </p>
                    )}
                  </motion.form>
                )}

                {step === "done" && placed && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.span
                      className="btn-gold flex h-24 w-24 items-center justify-center rounded-full"
                      initial={{ scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                    >
                      <CheckIcon size={42} weight="bold" />
                    </motion.span>
                    <p className="mt-8 font-display text-3xl text-text">Commande envoyée</p>
                    <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-text-2">
                      Elle est en attente de confirmation par notre équipe. Gardez votre téléphone à portée de main.
                    </p>
                    <p className="mt-8 text-[12px] uppercase tracking-[0.2em] text-text-3">Numéro de commande</p>
                    <p className="tabular mt-1 font-mono text-3xl tracking-wider text-gold-200">{placed.code}</p>
                    <p className="tabular mt-2 text-[14px] text-text-3">Total : {formatDA(placed.total)}</p>
                    <div className="mt-10 flex w-full flex-col gap-3">
                      <Link
                        href={`/commande/${placed.code}`}
                        className="btn-gold flex h-13 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
                      >
                        Suivre ma commande
                        <ArrowRightIcon size={17} weight="bold" />
                      </Link>
                      {settings.whatsapp && (
                        <a
                          href={whatsappLink(settings.whatsapp, `Bonjour, je viens de passer la commande ${placed.code} sur le site.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost flex h-13 items-center justify-center gap-2 rounded-full text-[14px]"
                        >
                          <WhatsappLogoIcon size={18} weight="light" />
                          Nous écrire sur WhatsApp
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pied : total + action */}
            {step !== "done" && cart.lines.length > 0 && (
              <div className="border-t border-line bg-bg/40 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <dl className="space-y-1.5 text-[14px]">
                  <div className="flex justify-between text-text-2">
                    <dt>Sous-total</dt>
                    <dd className="tabular">{formatDA(subtotal)}</dd>
                  </div>
                  {step === "checkout" && isDelivery && (
                    <div className="flex justify-between text-text-2">
                      <dt>Livraison</dt>
                      <dd className="tabular">{deliveryFee === 0 ? "Offerte" : formatDA(deliveryFee)}</dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1">
                    <dt className="text-text">Total</dt>
                    <dd className="tabular font-display text-3xl text-gold-100">{formatDA(step === "checkout" ? total : subtotal)}</dd>
                  </div>
                </dl>
                {ordering.delivery && ordering.freeDeliveryFrom > 0 && subtotal < ordering.freeDeliveryFrom && (step === "cart" || isDelivery) && (
                  <p className="mt-1 text-[12px] text-text-3">
                    Livraison offerte dès {formatDA(ordering.freeDeliveryFrom)}
                  </p>
                )}
                {belowMinimum && step === "checkout" && (
                  <p className="mt-2 text-[12px] text-warning">Minimum de {formatDA(ordering.minDeliveryOrder)} pour la livraison.</p>
                )}
                {!canOrder ? (
                  <p className="mt-4 rounded-2xl bg-surface-3 px-4 py-3 text-center text-[13px] text-text-2">
                    {!ordering.enabled ? "Les commandes en ligne sont momentanément suspendues." : `Commandes indisponibles : ${status.label.toLowerCase()}.`}
                  </p>
                ) : step === "cart" ? (
                  <button
                    type="button"
                    disabled={hasUnavailable}
                    onClick={goToCheckout}
                    className="btn-gold mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
                  >
                    Commander
                    <ArrowRightIcon size={17} weight="bold" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submitting || belowMinimum}
                    className="btn-gold mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
                  >
                    {submitting ? (
                      <>
                        <SpinnerGapIcon size={18} className="animate-spin" /> Envoi en cours
                      </>
                    ) : (
                      <>Envoyer la commande · {formatDA(total)}</>
                    )}
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
