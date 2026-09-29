"use client";

import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { formatDA } from "@/lib/format";
import { ITEM_TAGS, type ItemTag } from "@/lib/site-config";
import type { PublicMenuItem } from "@/lib/types";
import { useCart } from "../cart/CartContext";

const EASE = [0.32, 0.72, 0, 1] as const;

function AddButton({ onAdd, disabled, label }: { onAdd: () => void; disabled: boolean; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onAdd();
        setDone(true);
        window.setTimeout(() => setDone(false), 1100);
      }}
      aria-label={label}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        done ? "btn-gold" : "btn-ghost hover:text-gold-100"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {done ? (
          <motion.span key="ok" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
            <CheckIcon size={17} weight="bold" />
          </motion.span>
        ) : (
          <motion.span key="add" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
            <PlusIcon size={17} weight="light" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  const known = tags.filter((t): t is ItemTag => t in ITEM_TAGS);
  if (!known.length) return null;
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {known.map((tag) => (
        <span
          key={tag}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${
            tag === "signature"
              ? "bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-gold-200 ring-1 ring-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
              : "text-text-3 ring-1 ring-line-strong"
          }`}
        >
          {ITEM_TAGS[tag]}
        </span>
      ))}
    </span>
  );
}

export function ItemRow({ item }: { item: PublicMenuItem }) {
  const { add } = useCart();
  const unavailable = !item.isAvailable;
  const hasVariants = item.variants.length > 0;
  const fromPrice = hasVariants ? Math.min(...item.variants.map((v) => v.price)) : item.price;

  return (
    <article className={`group relative py-5 ${unavailable ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline">
            <h4 className="font-display text-[1.28rem] font-medium leading-snug text-text transition-colors duration-500 group-hover:text-gold-100 sm:text-[1.38rem]">
              {item.name}
            </h4>
            <span aria-hidden className="leader" />
            <span className="tabular shrink-0 text-[15px] font-medium text-gold-200">
              {hasVariants && <span className="mr-1 text-[11px] font-normal uppercase tracking-wider text-text-3">dès</span>}
              {formatDA(fromPrice)}
            </span>
          </div>
          {item.description && <p className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-text-3">{item.description}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <TagList tags={item.tags} />
            {unavailable && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-danger ring-1 ring-danger/40">
                Épuisé
              </span>
            )}
          </div>
          {hasVariants && !unavailable && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Options pour ${item.name}`}>
              {item.variants.map((variant) => (
                <button
                  key={variant.label}
                  type="button"
                  onClick={() => add(item.id, variant.label)}
                  className="btn-ghost inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px]"
                  aria-label={`Ajouter ${item.name}, ${variant.label}, ${formatDA(variant.price)}`}
                >
                  <PlusIcon size={13} weight="light" className="text-gold-300" />
                  {variant.label}
                  <span className="tabular text-text-3">{formatDA(variant.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!hasVariants && (
          <AddButton onAdd={() => add(item.id, null)} disabled={unavailable} label={`Ajouter ${item.name} au panier`} />
        )}
      </div>
    </article>
  );
}
