"use client";

import { useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { hue as hueOf } from "@/lib/color";
import { useClientValue, useMediaQuery } from "@/lib/hooks/useMediaQuery";

// Forme liquide métallique en WebGL brut (ThreeUI), teintée selon l'accent
const LiquidFormBackground = dynamic(
  () => import("@designcodeio/threeui/components/LiquidFormBackground").then((m) => m.LiquidFormBackground),
  { ssr: false },
);

/** Teinte de l'accent du site (--accent, posé par la mise en page). */
function accentHue() {
  return hueOf(getComputedStyle(document.documentElement).getPropertyValue("--accent"));
}

/**
 * Métal liquide aux couleurs de l'accent. Sur écran tactile, la version WebGL (lancer de rayons
 * sur chaque pixel) sature le processeur graphique d'un téléphone et fait saccader le défilement :
 * on affiche à la place un métal poli immobile, parcouru d'un reflet animé par le compositeur.
 */
export function LiquidGold({ className = "", hue }: { className?: string; hue?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { margin: "300px 0px", once: true });
  const touch = useMediaQuery("(hover: none), (pointer: coarse)");
  const accent = useClientValue(accentHue, 74);
  return (
    <div ref={ref} className={`absolute inset-0 ${className}`} aria-hidden>
      {touch ? (
        <div className="liquid-still" />
      ) : (
        near && (
          <LiquidFormBackground
            speed={0.55}
            morph={0.9}
            noiseScale={0.9}
            mouseAmount={0.2}
            metal={1}
            camera={5.8}
            tintHue={(hue ?? accent) - 8}
            tintAmount={0.55}
          />
        )
      )}
    </div>
  );
}
