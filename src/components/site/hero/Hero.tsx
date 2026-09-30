"use client";

import { ArrowDownRightIcon, MapPinIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/brand/Badge";
import { useClientValue, useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { OpenStatus } from "@/lib/hours";
import type { PublicSettings } from "@/lib/site-config";
import { scrollToId } from "../SmoothScroll";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const EASE = [0.16, 1, 0.3, 1] as const;

let webglSupport: boolean | undefined;
function supportsWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
      webglSupport = !!context;
      // Libère tout de suite ce contexte de test (leur nombre est limité par le navigateur)
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/** Apparition des textes. Le flou d'entrée est réservé aux ordinateurs : trop coûteux sur mobile. */
const RISE = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 1.1, delay: 0.35 + i * 0.13, ease: EASE } }),
};
const RISE_SOFT = {
  hidden: { ...RISE.hidden, filter: "blur(8px)" },
  show: (i: number) => ({ ...RISE.show(i), filter: "blur(0px)" }),
};

/** Logo à plat : sans WebGL, ou si la scène 3D échoue. */
function FlatLogo({ url }: { url: string | null }) {
  return (
    <div className="flex h-full items-center justify-center px-8">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-[50%] w-[min(60vw,420px)] object-contain" />
      ) : (
        <Badge className="w-[min(64vw,420px)]" />
      )}
    </div>
  );
}

/** Une erreur WebGL (contexte refusé, pilote) ne doit pas faire tomber toute la page. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Logo 3D indisponible", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Hero({ settings, status, play }: { settings: PublicSettings; status: OpenStatus; play: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;
  const webgl = useClientValue<boolean | null>(supportsWebGL, null);
  const soft = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [scene, setScene] = useState<"loading" | "ready" | "failed">("loading");
  const [active, setActive] = useState(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.02 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const initial = reduce ? false : "hidden";
  const animate = play ? "show" : "hidden";
  const rise = soft ? RISE_SOFT : RISE;

  return (
    <section
      id="top"
      ref={ref}
      className="relative isolate flex min-h-[100dvh] flex-col items-center justify-end overflow-hidden px-4 pb-14 pt-28 sm:pb-20"
    >
      {/* Lumières d'ambiance */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[38%] h-[70vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_40%,transparent_40%,var(--bg)_100%)]" />
      </div>

      {/* Logo 3D */}
      <motion.div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[78%] sm:h-[82%]" style={{ scale: reduce ? 1 : sceneScale }}>
        {(webgl === false || scene === "failed") && <FlatLogo url={settings.logoDataUrl} />}
        {webgl && scene !== "failed" && (
          <motion.div
            className="h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: play && scene === "ready" ? 1 : 0 }}
            transition={{ duration: 1.6, ease: EASE }}
          >
            <SceneBoundary onError={() => setScene("failed")}>
              <HeroScene
                accent={settings.theme.accent}
                active={active}
                play={play}
                reduceMotion={reduce}
                logoUrl={settings.logoDataUrl}
                scroll={scrollYProgress}
                onReady={() => setScene("ready")}
              />
            </SceneBoundary>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="relative flex w-full max-w-4xl flex-col items-center text-center"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <motion.p
          className="mb-6 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-text-2 ring-1 ring-line-strong"
          variants={rise}
          custom={0}
          initial={initial}
          animate={animate}
        >
          <span
            className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${status.isOpen ? "bg-success text-success" : "bg-text-3 text-text-3"}`}
            aria-hidden
          />
          {status.label}
        </motion.p>

        <motion.h1
          className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-medium leading-[1.05] tracking-[-0.01em] text-text"
          variants={rise}
          custom={1}
          initial={initial}
          animate={animate}
        >
          <span className="sr-only">{settings.restaurantName}, </span>
          {settings.tagline.replace("·", "&")} <em className="text-gold-200">à Oran</em>
        </motion.h1>

        <motion.p
          className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-text-2 sm:text-base"
          variants={rise}
          custom={2}
          initial={initial}
          animate={animate}
        >
          {settings.heroSubtitle}
        </motion.p>

        <motion.div
          className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center"
          variants={rise}
          custom={3}
          initial={initial}
          animate={animate}
        >
          <button
            type="button"
            onClick={() => scrollToId("carte")}
            className="btn-gold group inline-flex h-14 items-center justify-between gap-4 rounded-full pl-7 pr-2 text-[15px] font-semibold sm:justify-center"
          >
            Commander en ligne
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
              <ArrowDownRightIcon size={18} weight="bold" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollToId("infos")}
            className="btn-ghost inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 text-[15px]"
          >
            <MapPinIcon size={18} weight="light" className="text-gold-300" />
            Nous trouver
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
