"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";
import { AnimatedLogo } from "@/components/brand/AnimatedLogo";
import { INTRO_SESSION_KEY, introStore } from "./intro-store";

/** Script exécuté avant l'affichage : masque l'intro si elle a déjà été vue (évite tout flash). */
export const introBootScript = `try{if(sessionStorage.getItem("${INTRO_SESSION_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="skip"}}catch(e){}`;

export function useIntroDone() {
  return useSyncExternalStore(introStore.subscribe, introStore.getSnapshot, introStore.getServerSnapshot) === "done";
}

/**
 * Rideau d'ouverture : le logo se dessine puis le rideau se lève sur le site.
 * Joué une fois par session, passable d'un clic ou d'une touche.
 */
export function Intro({ tagline }: { tagline: string }) {
  const done = useIntroDone();

  useEffect(() => {
    if (done) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const safety = window.setTimeout(introStore.finish, 4200);
    window.addEventListener("keydown", introStore.finish, { once: true });
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener("keydown", introStore.finish);
      root.style.overflow = "";
    };
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="intro"
          className="intro-overlay fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-bg"
          onClick={introStore.finish}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          role="presentation"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[50vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)] blur-2xl"
          />
          <AnimatedLogo
            className="w-[min(72vw,560px)] text-[clamp(11px,1.6vw,15px)]"
            tagline={tagline}
            delay={0.15}
            onDone={() => window.setTimeout(introStore.finish, 250)}
          />
          <span className="absolute bottom-8 text-[11px] uppercase tracking-[0.3em] text-text-3">Toucher pour entrer</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
