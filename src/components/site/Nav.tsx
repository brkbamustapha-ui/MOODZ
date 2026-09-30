"use client";

import { InstagramLogoIcon, ShoppingBagOpenIcon, TiktokLogoIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { PublicSettings } from "@/lib/site-config";
import { useCart } from "./cart/CartContext";
import { scrollToId, setScrollLocked } from "./SmoothScroll";

const LINKS = [
  { href: "carte", label: "La carte" },
  { href: "signatures", label: "Signatures" },
  { href: "maison", label: "La maison" },
  { href: "infos", label: "Nous trouver" },
];

const EASE = [0.32, 0.72, 0, 1] as const;

export function Nav({ settings }: { settings: PublicSettings }) {
  const { count, open } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 40);
    setHidden(y > 420 && y > prev + 4 && !menuOpen);
    if (y < prev - 4) setHidden(false);
  });

  useEffect(() => {
    setScrollLocked(menuOpen);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (menuOpen) setScrollLocked(false);
    };
  }, [menuOpen]);

  const go = (id: string) => {
    setMenuOpen(false);
    requestAnimationFrame(() => scrollToId(id));
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:pt-5"
        animate={{ y: hidden ? -110 : 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <nav
          aria-label="Navigation principale"
          className={`glass flex h-14 w-full max-w-[1100px] items-center justify-between gap-3 rounded-full pl-1.5 pr-2 transition-[background-color] duration-700 sm:h-16 sm:pl-2 ${
            scrolled ? "" : "bg-transparent!"
          }`}
        >
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              go("top");
            }}
            className="flex items-center gap-3 rounded-full"
            aria-label={`${settings.restaurantName}, retour en haut`}
          >
            <BrandLogo
              src={settings.logoDataUrl}
              alt={settings.restaurantName}
              className="h-11 w-11 drop-shadow-[0_6px_14px_rgb(0_0_0/0.35)] sm:h-12 sm:w-12"
              imageClassName="h-10 w-auto object-contain pl-2"
            />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={`#${link.href}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(link.href);
                  }}
                  className="rounded-full px-4 py-2 text-[13px] tracking-wide text-text-2 transition-colors duration-500 hover:text-gold-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={open}
              className={`group relative flex h-10 items-center gap-2 rounded-full pl-3.5 pr-4 text-[13px] font-medium sm:h-11 ${
                count > 0 ? "btn-gold" : "btn-ghost"
              }`}
              aria-label={`Ouvrir le panier, ${count} article${count > 1 ? "s" : ""}`}
            >
              <ShoppingBagOpenIcon size={18} weight={count > 0 ? "regular" : "light"} />
              <span className="hidden sm:inline">Panier</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={count}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="tabular min-w-[1ch] text-center"
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </button>

            <button
              type="button"
              className="btn-ghost relative flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <span
                className={`absolute h-px w-4 bg-text transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? "rotate-45" : "-translate-y-[4px]"
                }`}
              />
              <span
                className={`absolute h-px w-4 bg-text transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? "-rotate-45" : "translate-y-[4px]"
                }`}
              />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="menu-mobile"
            className="fixed inset-0 z-30 flex flex-col bg-bg/95 px-6 pb-10 pt-28 lg:hidden pointer-fine:bg-bg/85 pointer-fine:backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <ul className="flex flex-col gap-2">
              {LINKS.map((link, i) => (
                <li key={link.href} className="overflow-hidden">
                  <motion.a
                    href={`#${link.href}`}
                    onClick={(e) => {
                      e.preventDefault();
                      go(link.href);
                    }}
                    className="block py-2 font-display text-5xl font-medium text-text"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "110%" }}
                    transition={{ duration: 0.7, delay: 0.08 + i * 0.06, ease: EASE }}
                  >
                    {link.label}
                  </motion.a>
                </li>
              ))}
            </ul>
            <motion.div
              className="mt-auto flex items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            >
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost flex h-12 w-12 items-center justify-center rounded-full" aria-label="Instagram">
                  <InstagramLogoIcon size={20} weight="light" />
                </a>
              )}
              {settings.tiktok && (
                <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="btn-ghost flex h-12 w-12 items-center justify-center rounded-full" aria-label="TikTok">
                  <TiktokLogoIcon size={20} weight="light" />
                </a>
              )}
              <span className="ml-auto text-sm text-text-3">{settings.address}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
