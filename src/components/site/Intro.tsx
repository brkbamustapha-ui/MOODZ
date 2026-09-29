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

/** Logo importé par le gérant : apparition floue vers nette, puis reflet lumineux. */
function UploadedLogoReveal({ url, tagline }: { url: string; tagline: string }) {
  const mask = { WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")` };
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative w-[min(58vw,340px)]"
        initial={{ opacity: 0, scale: 0.9, filter: "blur(14px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="block w-full" />
        <motion.div
          aria-hidden
          className="absolute inset-0 [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
          style={{
            ...mask,
            background: "linear-gradient(100deg, transparent 35%, rgb(255 250 235 / 0.85) 50%, transparent 65%)",
            backgroundSize: "250% 100%",
          }}
          initial={{ backgroundPosition: "140% 0" }}
          animate={{ backgroundPosition: "-40% 0" }}
          transition={{ delay: 1.3, duration: 1.3, ease: [0.45, 0, 0.2, 1] }}
          onAnimationComplete={() => window.setTimeout(introStore.finish, 300)}
        />
      </motion.div>
      <motion.p
        className="mt-6 text-[12px] uppercase tracking-[0.42em] text-gold-200"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.9 }}
      >
        {tagline}
      </motion.p>
    </div>
  );
}

/**
 * Rideau d'ouverture : le logo se dessine puis le rideau se lève sur le site.
 * Joué une fois par session, passable d'un clic ou d'une touche.
 */
export function Intro({ tagline, logoUrl }: { tagline: string; logoUrl?: string | null }) {
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
            className="pointer-events-none absolute left-1/2 top-1/2 h-[50vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
          />
          {logoUrl ? (
            <UploadedLogoReveal url={logoUrl} tagline={tagline} />
          ) : (
            <AnimatedLogo
              className="w-[min(72vw,560px)] text-[clamp(11px,1.6vw,15px)]"
              tagline={tagline}
              delay={0.15}
              onDone={() => window.setTimeout(introStore.finish, 250)}
            />
          )}
          <span className="absolute bottom-8 text-[11px] uppercase tracking-[0.3em] text-text-3">Toucher pour entrer</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
