"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const color = useTransform(progress, [range[0], range[1], range[1] + 0.08], ["var(--text-3)", "var(--gold-100)", "var(--text)"]);
  return (
    <motion.span style={{ opacity, color }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  );
}

/** Texte de présentation qui s'illumine mot après mot au fil du défilement. */
function ScrubText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(/\s+/).filter(Boolean);

  if (reduce) {
    return <p className="font-display text-[clamp(1.7rem,3.4vw,2.9rem)] leading-[1.22] text-text">{text}</p>;
  }
  return (
    <p ref={ref} className="font-display text-[clamp(1.7rem,3.4vw,2.9rem)] leading-[1.22]" aria-label={text}>
      {words.map((word, i) => {
        const start = i / words.length;
        return <Word key={`${word}-${i}`} word={word} progress={scrollYProgress} range={[start, Math.min(1, start + 1.5 / words.length)]} />;
      })}
    </p>
  );
}

export function Experience({ title, text, words }: { title: string; text: string; words: string[] }) {
  const band = words.length ? words : ["Café", "Brunch", "Burgers", "Pizzas", "Desserts"];
  const loop = [...band, ...band];

  return (
    <section id="maison" className="relative overflow-hidden py-28 sm:py-40">
      <div className="mx-auto max-w-[1100px] px-4">
        <motion.h2
          className="text-[13px] font-medium uppercase tracking-[0.3em] text-gold-300"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {title}
        </motion.h2>
        <div className="mt-8">
          <ScrubText text={text} />
        </div>
      </div>

      {/* Bandeau défilant : l'étendue de la carte en un coup d'œil */}
      <div className="relative mt-24 select-none sm:mt-32" aria-hidden>
        <div className="hairline-gold" />
        <div className="flex overflow-hidden py-7">
          <div className="marquee-track flex shrink-0 items-center gap-10 pr-10">
            {loop.map((word, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                <span
                  className={`font-display text-[clamp(2.6rem,6vw,5.2rem)] italic leading-none ${
                    i % 2 ? "text-transparent [-webkit-text-stroke:1px_var(--gold-400)]" : "text-text"
                  }`}
                >
                  {word}
                </span>
                <span className="h-2 w-2 rotate-45 bg-gold-400" />
              </span>
            ))}
          </div>
        </div>
        <div className="hairline-gold" />
      </div>
    </section>
  );
}
