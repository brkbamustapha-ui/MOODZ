"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef } from "react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { PublicCategory } from "@/lib/types";
import { CategoryIcon } from "../CategoryIcon";

type Props = {
  categories: PublicCategory[];
  active: number;
  onChange: (index: number) => void;
};

function useCardWidth() {
  return useMediaQuery("(min-width: 768px)") ? 196 : 150;
}

/** Normalise un angle dans ]-180, 180]. */
function wrap(angle: number) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}

function RingCard({
  category,
  index,
  step,
  radius,
  rotation,
  isActive,
  onSelect,
  width,
}: {
  category: PublicCategory;
  index: number;
  step: number;
  radius: number;
  rotation: MotionValue<number>;
  isActive: boolean;
  onSelect: () => void;
  width: number;
}) {
  const base = index * step;
  // Angle de la carte par rapport à l'avant de la scène : 0 = face au visiteur
  const facing = useTransform(rotation, (r) => Math.cos((wrap(base + r) * Math.PI) / 180));
  const opacity = useTransform(facing, [-0.2, 0.35, 1], [0, 0.35, 1]);
  // Assombrissement des cartes de côté par un voile plutôt qu'un filtre CSS : un filtre par carte
  // imposait au téléphone une passe de rendu supplémentaire à chaque image, même au défilement
  const shade = useTransform(facing, [0, 1], [0.55, 0]);

  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      className="absolute left-1/2 top-1/2 [backface-visibility:hidden]"
      style={{
        width,
        marginLeft: -width / 2,
        marginTop: -80,
        transform: `rotateY(${base}deg) translateZ(${radius}px)`,
        opacity,
      }}
    >
      <span
        className={`relative flex h-40 flex-col justify-between overflow-hidden rounded-[1.4rem] p-4 text-left transition-[box-shadow,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isActive
            ? "bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_24%,var(--surface-2)),var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_60%,transparent),0_30px_60px_-30px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
            : "bg-[linear-gradient(160deg,var(--surface-3),var(--surface))] shadow-[inset_0_0_0_1px_var(--line)]"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_28%,transparent),transparent)]"
        />
        <motion.span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-black" style={{ opacity: shade }} />
        <CategoryIcon
          name={category.icon}
          size={30}
          weight={isActive ? "regular" : "light"}
          className={isActive ? "text-gold-200" : "text-gold-400"}
        />
        <span>
          <span className="block font-display text-[1.32rem] font-medium leading-[1.05] text-text">{category.name}</span>
          <span className="mt-1.5 block text-[11px] uppercase tracking-[0.18em] text-text-3">
            {category.items.length} choix
          </span>
        </span>
      </span>
    </motion.button>
  );
}

/**
 * Carrousel circulaire en 3D : les catégories sont disposées sur un cylindre.
 * Glisser, cliquer ou utiliser les flèches pour tourner ; la catégorie de face est sélectionnée.
 */
export function CategoryRing({ categories, active, onChange }: Props) {
  const reduce = useReducedMotion();
  const width = useCardWidth();
  const count = categories.length;
  const step = 360 / Math.max(count, 1);
  const radius = Math.max(width * 1.15, ((width + 22) * count) / (2 * Math.PI));
  const rotation = useMotionValue(-active * step);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Tourne vers la catégorie active par le chemin le plus court
  useEffect(() => {
    const current = rotation.get();
    const target = current + wrap(-active * step - current);
    const controls = animate(rotation, target, reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 18, mass: 1 });
    return () => controls.stop();
  }, [active, step, rotation, reduce]);

  const ringTransform = useTransform(rotation, (r) => `translateZ(${-radius}px) rotateY(${r}deg)`);

  const snap = () => {
    const index = ((Math.round(-rotation.get() / step) % count) + count) % count;
    if (index === active) {
      const current = rotation.get();
      animate(rotation, current + wrap(-active * step - current), { type: "spring", stiffness: 90, damping: 20 });
    }
    onChange(index);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, start: rotation.get(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 6 && !drag.current.moved) {
      drag.current.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (drag.current.moved) rotation.set(drag.current.start + dx * (180 / (Math.PI * radius)));
  };
  const onPointerUp = () => {
    if (drag.current?.moved) {
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 50);
      snap();
    }
    drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") onChange((active + 1) % count);
    if (e.key === "ArrowLeft") onChange((active - 1 + count) % count);
  };

  return (
    <div className="relative">
      <div
        className="relative mx-auto h-[250px] w-full cursor-grab select-none overflow-visible active:cursor-grabbing md:h-[270px]"
        style={{ perspective: 1100, perspectiveOrigin: "50% 40%", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        role="tablist"
        aria-label="Catégories de la carte"
        onKeyDown={onKeyDown}
      >
        <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: ringTransform }}>
          {categories.map((category, index) => (
            <RingCard
              key={category.id}
              category={category}
              index={index}
              step={step}
              radius={radius}
              rotation={rotation}
              isActive={index === active}
              onSelect={() => onChange(index)}
              width={width}
            />
          ))}
        </motion.div>
        {/* Reflet au sol */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[10%] bottom-2 h-10 rounded-[100%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_16%,transparent),transparent)]"
        />
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChange((active - 1 + count) % count)}
          className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="Catégorie précédente"
        >
          <CaretLeftIcon size={18} weight="light" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {categories.map((c, i) => (
            <span
              key={c.id}
              className={`h-1 rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                i === active ? "w-6 bg-gold-300" : "w-1 bg-line-strong"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange((active + 1) % count)}
          className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full"
          aria-label="Catégorie suivante"
        >
          <CaretRightIcon size={18} weight="light" />
        </button>
      </div>
    </div>
  );
}
