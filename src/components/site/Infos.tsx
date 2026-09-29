"use client";

import {
  ArrowUpRightIcon,
  InstagramLogoIcon,
  PhoneIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { algiersClock, type OpenStatus } from "@/lib/hours";
import { useClientValue } from "@/lib/hooks/useMediaQuery";
import { DAY_KEYS, DAY_LABELS, type DayKey, type PublicSettings } from "@/lib/site-config";

const EASE = [0.16, 1, 0.3, 1] as const;

export function handleFromUrl(url: string) {
  const last = url.split("?")[0].split("/").filter(Boolean).pop() ?? "";
  return `@${last.replace(/^@/, "")}`;
}

export function whatsappLink(number: string, text?: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `213${digits.slice(1)}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

const STEPS = [
  { title: "Composez votre panier", text: "Parcourez la carte et ajoutez vos envies, en quelques secondes." },
  { title: "Envoyez la commande", text: "À emporter, en livraison ou sur place : indiquez simplement votre numéro." },
  { title: "Nous confirmons", text: "Notre équipe valide la commande et vous suivez son avancement en direct." },
];

export function Infos({ settings, status }: { settings: PublicSettings; status: OpenStatus }) {
  const today = useClientValue<DayKey | null>(() => algiersClock().day, null);

  return (
    <section id="infos" className="relative px-4 py-28 sm:py-40">
      <div className="mx-auto max-w-[1200px]">
        {/* Comment commander */}
        <div className="relative mb-28 sm:mb-36">
          <div aria-hidden className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-gold-400 via-line-strong to-transparent md:left-0 md:right-0 md:top-[19px] md:bottom-auto md:h-px md:w-auto md:bg-gradient-to-r" />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                className="relative flex gap-5 md:flex-col"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
              >
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg font-display text-lg text-gold-200 ring-1 ring-gold-400">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-[1.7rem] font-medium leading-tight text-text">{step.title}</h3>
                  <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-text-3">{step.text}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: EASE }}
          >
            <h2 className="font-display text-[clamp(2.8rem,6.5vw,5rem)] font-medium leading-[0.98] tracking-[-0.02em] text-text">
              Nous <em className="text-gold-200">trouver</em>
            </h2>
            <p className="mt-6 max-w-[30ch] font-display text-2xl leading-snug text-text-2">{settings.address}</p>

            <div className="mt-10 flex flex-wrap gap-3">
              {settings.mapsUrl && (
                <a
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold group inline-flex h-13 items-center gap-3 rounded-full pl-6 pr-1.5 text-[14px] font-semibold"
                >
                  Itinéraire
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/15 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                    <ArrowUpRightIcon size={16} weight="bold" />
                  </span>
                </a>
              )}
              {settings.phone && (
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="btn-ghost inline-flex h-13 items-center gap-2.5 rounded-full px-6 text-[14px]">
                  <PhoneIcon size={18} weight="light" className="text-gold-300" />
                  {settings.phone}
                </a>
              )}
              {settings.whatsapp && (
                <a
                  href={whatsappLink(settings.whatsapp, "Bonjour MOODZ !")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost inline-flex h-13 items-center gap-2.5 rounded-full px-6 text-[14px]"
                >
                  <WhatsappLogoIcon size={18} weight="light" className="text-gold-300" />
                  WhatsApp
                </a>
              )}
            </div>

            <div className="mt-12 flex items-center gap-3">
              {settings.instagram && (
                <a
                  href={settings.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost group inline-flex h-12 items-center gap-2.5 rounded-full pl-2 pr-5 text-[14px]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                    <InstagramLogoIcon size={17} weight="light" />
                  </span>
                  {handleFromUrl(settings.instagram)}
                </a>
              )}
              {settings.tiktok && (
                <a
                  href={settings.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost group inline-flex h-12 items-center gap-2.5 rounded-full pl-2 pr-5 text-[14px]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                    <TiktokLogoIcon size={17} weight="light" />
                  </span>
                  TikTok
                </a>
              )}
            </div>
          </motion.div>

          <motion.div
            className="bezel"
            initial={{ opacity: 0, y: 40, rotateX: 6 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.1, delay: 0.1, ease: EASE }}
          >
            <div className="bezel-core p-7 sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-3xl text-text">Horaires</h3>
                <span className={`inline-flex items-center gap-2 text-[13px] ${status.isOpen ? "text-success" : "text-text-3"}`}>
                  <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${status.isOpen ? "bg-success" : "bg-text-3"}`} />
                  {status.label}
                </span>
              </div>
              <dl className="mt-7 space-y-1">
                {DAY_KEYS.map((day) => {
                  const h = settings.hours[day];
                  const isToday = today === day;
                  return (
                    <div
                      key={day}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-[15px] ${
                        isToday ? "bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]" : ""
                      }`}
                    >
                      <dt className={isToday ? "font-medium text-gold-100" : "text-text-2"}>
                        {DAY_LABELS[day]}
                        {isToday && <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-gold-300">aujourd&apos;hui</span>}
                      </dt>
                      <dd className="tabular text-text">
                        {h.closed ? <span className="text-text-3">Fermé</span> : `${h.open} à ${h.close === "23:59" ? "minuit" : h.close}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
