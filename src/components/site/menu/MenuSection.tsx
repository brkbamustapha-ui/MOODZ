"use client";

import { ArrowRightIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import type { PublicCategory } from "@/lib/types";
import { CategoryIcon } from "../CategoryIcon";
import { scrollToY } from "../SmoothScroll";
import { CategoryRing } from "./CategoryRing";
import { ItemRow } from "./ItemRow";

const EASE = [0.16, 1, 0.3, 1] as const;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function Panel({ category, direction }: { category: PublicCategory; direction: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={category.id}
      custom={direction}
      initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: direction * 28, x: direction * 80, z: -140 }}
      animate={{ opacity: 1, rotateY: 0, x: 0, z: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: direction * -28, x: direction * -80, z: -140 }}
      transition={{ duration: 0.75, ease: EASE }}
      className="bezel [transform-style:preserve-3d]"
      role="tabpanel"
      aria-label={category.name}
    >
      <div className="bezel-core px-5 pb-6 pt-7 sm:px-10 sm:pb-10 sm:pt-10">
        <header className="flex items-start gap-4 border-b border-line pb-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-gold-200 ring-1 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]">
            <CategoryIcon name={category.icon} size={24} />
          </span>
          <div>
            <h3 className="font-display text-3xl font-medium leading-tight text-text sm:text-4xl">{category.name}</h3>
            {category.description && <p className="mt-1 text-[14px] text-text-3">{category.description}</p>}
          </div>
        </header>
        <div className="grid grid-cols-1 gap-x-14 lg:grid-cols-2">
          {category.items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.18 + Math.min(i, 10) * 0.045, ease: EASE }}
              className="border-b border-line/70 last:border-b-0 lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
            >
              <ItemRow item={item} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function MenuSection({ menu }: { menu: PublicCategory[] }) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [query, setQuery] = useState("");
  const ringRef = useRef<HTMLDivElement>(null);
  const ringVisible = useInView(ringRef, { margin: "-80px 0px 0px 0px" });
  const sectionRef = useRef<HTMLElement>(null);
  const sectionVisible = useInView(sectionRef, { margin: "-170px 0px -25% 0px" });
  const panelTop = useRef<HTMLDivElement>(null);

  const select = (index: number, scroll = false) => {
    if (index === active) return;
    const forward = (index - active + menu.length) % menu.length <= menu.length / 2;
    setDirection(forward ? 1 : -1);
    setActive(index);
    setQuery("");
    if (scroll && panelTop.current) {
      const top = panelTop.current.getBoundingClientRect().top + window.scrollY - 150;
      if (window.scrollY > top) scrollToY(top);
    }
  };

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return null;
    return menu
      .map((c) => ({ ...c, items: c.items.filter((i) => normalize(`${i.name} ${i.description}`).includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [menu, query]);

  if (menu.length === 0) {
    return (
      <section id="carte" className="px-4 py-32 text-center">
        <h2 className="font-display text-5xl text-text">La carte</h2>
        <p className="mt-4 text-text-3">La carte est en cours de mise à jour. Revenez très vite.</p>
      </section>
    );
  }

  const category = menu[Math.min(active, menu.length - 1)];
  const next = menu[(active + 1) % menu.length];

  return (
    <section id="carte" ref={sectionRef} className="relative px-4 pb-28 pt-28 sm:pb-40 sm:pt-36">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col items-center text-center">
          <motion.h2
            className="font-display text-[clamp(3rem,8vw,6rem)] font-medium leading-[0.95] tracking-[-0.02em] text-text"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            La <em className="text-gold-200">carte</em>
          </motion.h2>
          <motion.p
            className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-text-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, delay: 0.1, ease: EASE }}
          >
            Faites tourner les catégories, ajoutez vos envies au panier. Nous confirmons chaque commande.
          </motion.p>

          <div className="relative mt-9 w-full max-w-md">
            <label htmlFor="menu-search" className="sr-only">
              Rechercher un plat ou une boisson
            </label>
            <MagnifyingGlassIcon size={18} weight="light" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              id="menu-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher : cappuccino, burger, tiramisu..."
              className="h-13 w-full rounded-full bg-surface/80 pl-12 pr-12 text-[15px] text-text shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow duration-500 placeholder:text-text-3 focus:shadow-[inset_0_0_0_1px_var(--gold-400)]"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-3 hover:text-text"
                aria-label="Effacer la recherche"
              >
                <XIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <div ref={ringRef} className="mt-10 sm:mt-14">
          <CategoryRing categories={menu} active={active} onChange={(i) => select(i)} />
        </div>

        {/* Barre de catégories compacte, visible quand le carrousel sort de l'écran */}
        <AnimatePresence>
          {!ringVisible && sectionVisible && !results && (
            <motion.div
              className="fixed inset-x-0 top-[76px] z-30 flex justify-center px-3 sm:top-[92px]"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none]">
                {menu.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(i, true)}
                    className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] transition-colors duration-500 ${
                      i === active ? "btn-gold font-medium" : "text-text-2 hover:text-text"
                    }`}
                  >
                    <CategoryIcon name={c.icon} size={15} weight={i === active ? "regular" : "light"} />
                    {c.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={panelTop} className="relative mt-12" style={{ perspective: 1600 }}>
          {results ? (
            <div className="bezel">
              <div className="bezel-core px-5 pb-6 pt-7 sm:px-10 sm:pt-10">
                <p className="text-[13px] uppercase tracking-[0.18em] text-text-3">
                  {results.reduce((n, c) => n + c.items.length, 0)} résultat(s) pour « {query.trim()} »
                </p>
                {results.length === 0 && (
                  <p className="py-10 text-center text-text-2">Aucun plat ne correspond. Essayez un autre mot.</p>
                )}
                {results.map((c) => (
                  <div key={c.id} className="mt-6">
                    <h3 className="flex items-center gap-2 font-display text-2xl text-gold-200">
                      <CategoryIcon name={c.icon} size={20} /> {c.name}
                    </h3>
                    <div className="grid grid-cols-1 gap-x-14 lg:grid-cols-2">
                      {c.items.map((item) => (
                        <div key={item.id} className="border-b border-line/70">
                          <ItemRow item={item} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <Panel key={category.id} category={category} direction={direction} />
            </AnimatePresence>
          )}

          {!results && menu.length > 1 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => select((active + 1) % menu.length, true)}
                className="btn-ghost group inline-flex h-12 items-center gap-3 rounded-full pl-6 pr-2 text-[14px]"
              >
                <span className="text-text-3">Ensuite</span>
                <span className="font-display text-lg text-text">{next.name}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-transform duration-500 group-hover:translate-x-0.5">
                  <ArrowRightIcon size={15} weight="light" />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
