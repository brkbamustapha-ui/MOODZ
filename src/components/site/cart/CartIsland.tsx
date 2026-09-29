"use client";

import { CheckCircleIcon, ShoppingBagOpenIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatDA } from "@/lib/format";
import { useCart } from "./CartContext";

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Îlot flottant : récapitulatif du panier en bas d'écran (mobile)
 * et confirmation discrète à chaque ajout (tous écrans).
 */
export function CartIsland() {
  const { count, subtotal, open, isOpen, lastAdded } = useCart();
  // Le message « Ajouté » s'efface 1,8 s après le dernier ajout
  const [expired, setExpired] = useState(0);
  const flash = lastAdded && lastAdded.at > expired ? lastAdded.name : null;

  useEffect(() => {
    if (!lastAdded) return;
    const t = window.setTimeout(() => setExpired(lastAdded.at), 1800);
    return () => window.clearTimeout(t);
  }, [lastAdded]);

  return (
    <>
      {/* Mobile : barre panier */}
      <AnimatePresence>
        {count > 0 && !isOpen && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <button
              type="button"
              onClick={open}
              className="btn-gold flex h-16 w-full items-center justify-between rounded-full pl-2 pr-6 text-left"
              aria-label={`Voir le panier, ${count} article${count > 1 ? "s" : ""}, ${formatDA(subtotal)}`}
            >
              <span className="flex items-center gap-3">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/15">
                  <ShoppingBagOpenIcon size={22} />
                  <span className="tabular absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bg px-1 text-[11px] font-semibold text-gold-200">
                    {count}
                  </span>
                </span>
                <span className="flex flex-col">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={flash ?? "idle"}
                      className="max-w-[46vw] truncate text-[14px] font-semibold"
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -8, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      {flash ? `Ajouté : ${flash}` : "Voir le panier"}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
              <span className="tabular text-[15px] font-semibold">{formatDA(subtotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ordinateur : confirmation d'ajout */}
      <AnimatePresence>
        {flash && !isOpen && (
          <motion.div
            className="fixed right-6 top-24 z-40 hidden sm:block"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.45, ease: EASE }}
            role="status"
          >
            <button type="button" onClick={open} className="glass flex items-center gap-3 rounded-full py-2 pl-2 pr-5 text-[14px]">
              <CheckCircleIcon size={26} weight="fill" className="text-gold-300" />
              <span className="max-w-[260px] truncate">
                <span className="text-text-3">Ajouté : </span>
                {flash}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
