"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { formatDA } from "@/lib/format";
import type { PublicMenuItem } from "@/lib/types";
import { useCart } from "./cart/CartContext";
import { LiquidGold } from "./LiquidGold";
import { TiltCard } from "./TiltCard";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Répartition sans case vide : le nombre de cellules correspond toujours au nombre d'articles. */
const LAYOUTS: Record<number, string[]> = {
  1: ["md:col-span-4 md:row-span-2"],
  2: ["md:col-span-2 md:row-span-2", "md:col-span-2 md:row-span-2"],
  3: ["md:col-span-2 md:row-span-2", "md:col-span-2", "md:col-span-2"],
  4: ["md:col-span-2 md:row-span-2", "md:col-span-2", "md:col-span-1", "md:col-span-1"],
  5: ["md:col-span-2 md:row-span-2", "md:col-span-1", "md:col-span-1", "md:col-span-1", "md:col-span-1"],
};

const SURFACES = [
  "bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_60%),linear-gradient(180deg,var(--surface-2),var(--surface))]",
  "bg-[repeating-linear-gradient(135deg,rgb(236_242_212/0.035)_0_1px,transparent_1px_14px),linear-gradient(180deg,var(--surface-2),var(--surface))]",
  "bg-[radial-gradient(90%_70%_at_0%_100%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_65%),linear-gradient(180deg,var(--surface-3),var(--surface))]",
  "bg-[conic-gradient(from_210deg_at_110%_-10%,color-mix(in_oklab,var(--accent)_20%,transparent),transparent_35%),linear-gradient(180deg,var(--surface-2),var(--bg-2))]",
];

function priceOf(item: PublicMenuItem) {
  return item.variants.length ? Math.min(...item.variants.map((v) => v.price)) : item.price;
}

export function Signatures({ items }: { items: PublicMenuItem[] }) {
  const { add } = useCart();
  const list = items.slice(0, 5);
  if (list.length === 0) return null;
  const layout = LAYOUTS[list.length];

  const addItem = (item: PublicMenuItem) => add(item.id, item.variants[0]?.label ?? null);

  return (
    <section id="signatures" className="relative px-4 py-28 sm:py-36">
      <div className="mx-auto max-w-[1200px]">
        <motion.h2
          className="max-w-[22ch] font-display text-[clamp(2.6rem,6vw,4.6rem)] font-medium leading-[1] tracking-[-0.02em] text-text"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          Les signatures <em className="text-gold-200">de la maison</em>
        </motion.h2>

        <div className="mt-14 grid grid-flow-dense grid-cols-1 gap-4 md:auto-rows-[290px] md:grid-cols-4 md:gap-5">
          {list.map((item, i) => {
            const hero = i === 0 && list.length > 1;
            return (
              <motion.div
                key={item.id}
                className={`${layout[i]} ${hero ? "min-h-[420px]" : "min-h-[240px]"} md:min-h-0`}
                initial={{ opacity: 0, y: 40, rotateX: 8 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1, delay: i * 0.08, ease: EASE }}
              >
                <TiltCard className="h-full" max={hero ? 4 : 7}>
                  <div className="bezel h-full">
                    <div className={`bezel-core relative flex h-full flex-col justify-end overflow-hidden p-6 ${hero ? "sm:p-9" : "sm:p-7"} ${hero ? "" : SURFACES[i % SURFACES.length]}`}>
                      {hero && (
                        <>
                          <LiquidGold className="rounded-[inherit] opacity-80" />
                          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgb(12_16_7/0.55)_55%,rgb(12_16_7/0.92))]" />
                        </>
                      )}
                      <div className="relative [transform:translateZ(40px)]">
                        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-gold-300">Signature</p>
                        <h3 className={`mt-3 font-display font-medium leading-[1.02] text-text ${hero ? "text-[clamp(2.2rem,4vw,3.4rem)]" : "line-clamp-2 text-[1.7rem]"}`}>
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className={`mt-3 max-w-[40ch] leading-relaxed text-text-2 ${hero ? "text-[15px]" : "line-clamp-2 text-[14px]"}`}>
                            {item.description}
                          </p>
                        )}
                        <div className="mt-6 flex items-center justify-between gap-4">
                          <span className="tabular font-display text-2xl text-gold-100">
                            {item.variants.length > 0 && <span className="mr-1.5 font-sans text-xs uppercase tracking-wider text-text-3">dès</span>}
                            {formatDA(priceOf(item))}
                          </span>
                          <button
                            type="button"
                            disabled={!item.isAvailable}
                            onClick={() => addItem(item)}
                            className="btn-gold group inline-flex h-11 items-center gap-2 rounded-full pl-4 pr-1.5 text-[13px] font-semibold"
                            aria-label={`Ajouter ${item.name} au panier`}
                          >
                            {item.isAvailable ? "Ajouter" : "Épuisé"}
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 transition-transform duration-500 group-hover:rotate-90">
                              <PlusIcon size={15} weight="bold" />
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
