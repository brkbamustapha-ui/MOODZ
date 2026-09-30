"use client";

import {
  ArrowSquareOutIcon,
  BellRingingIcon,
  BellSlashIcon,
  BookOpenTextIcon,
  ChartLineUpIcon,
  GearSixIcon,
  ReceiptIcon,
  SignOutIcon,
  SquaresFourIcon,
  type Icon,
} from "@phosphor-icons/react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/brand/Badge";
import { api } from "@/lib/admin-api";
import { PulseProvider, usePulse } from "./PulseContext";
import { ToastProvider } from "./ui";

const NAV: { href: string; label: string; icon: Icon; badge?: "pending" }[] = [
  { href: "/admin", label: "Aperçu", icon: SquaresFourIcon },
  { href: "/admin/commandes", label: "Commandes", icon: ReceiptIcon, badge: "pending" },
  { href: "/admin/carte", label: "Carte", icon: BookOpenTextIcon },
  { href: "/admin/revenus", label: "Revenus", icon: ChartLineUpIcon },
  { href: "/admin/reglages", label: "Réglages", icon: GearSixIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Sidebar({ username }: { username: string }) {
  const pathname = usePathname();
  const { pending, soundOn, setSoundOn } = usePulse();

  const logout = async () => {
    await api("/api/admin/logout", { method: "POST" }).catch(() => null);
    window.location.assign(new URL("/admin/login", window.location.origin).href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col p-4 lg:flex">
      <div className="glass flex h-full flex-col rounded-[1.75rem] px-4 py-6">
        <Link href="/admin" className="flex items-center gap-3 px-2">
          <Badge className="h-12 w-12 shrink-0" compact />
          <span className="text-[10px] uppercase leading-relaxed tracking-[0.3em] text-text-3">Espace gérant</span>
        </Link>

        <nav className="mt-10 flex flex-col gap-1" aria-label="Navigation du tableau de bord">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const IconCmp = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[14px] transition-colors duration-300 ${
                  active ? "text-text" : "text-text-2 hover:bg-white/4 hover:text-text"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute inset-0 rounded-2xl bg-[linear-gradient(120deg,color-mix(in_oklab,var(--accent)_20%,transparent),color-mix(in_oklab,var(--accent)_6%,transparent))] ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
                <IconCmp size={20} weight={active ? "regular" : "light"} className={`relative ${active ? "text-gold-200" : ""}`} />
                <span className="relative">{item.label}</span>
                {item.badge === "pending" && pending > 0 && (
                  <span className="tabular relative ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-gold-300 px-1.5 text-[12px] font-semibold text-[var(--on-accent)]">
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[13px] text-text-2 hover:bg-white/4 hover:text-text"
          >
            {soundOn ? <BellRingingIcon size={18} weight="light" /> : <BellSlashIcon size={18} weight="light" />}
            Alerte sonore {soundOn ? "activée" : "coupée"}
          </button>
          <Link href="/" target="_blank" className="flex h-11 items-center gap-3 rounded-2xl px-3.5 text-[13px] text-text-2 hover:bg-white/4 hover:text-text">
            <ArrowSquareOutIcon size={18} weight="light" /> Voir le site
          </Link>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/3 px-3 py-2.5 ring-1 ring-line">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] font-display text-lg uppercase text-gold-200">
              {username.charAt(0)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-text">{username}</span>
            <button type="button" onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-full text-text-3 hover:bg-white/5 hover:text-danger" aria-label="Se déconnecter" title="Se déconnecter">
              <SignOutIcon size={17} weight="light" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileBar() {
  const pathname = usePathname();
  const { pending } = usePulse();
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
        <div className="glass flex h-14 w-full items-center justify-between rounded-full pl-1.5 pr-2">
          <Link href="/admin" aria-label="Aperçu">
            <Badge className="h-11 w-11" compact />
          </Link>
          <Link href="/admin/reglages" className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full" aria-label="Réglages">
            <GearSixIcon size={18} weight="light" />
          </Link>
        </div>
      </header>
      <nav
        className="glass fixed inset-x-3 bottom-3 z-30 grid h-16 grid-cols-5 rounded-full px-1.5 pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Navigation du tableau de bord"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const IconCmp = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center gap-0.5 text-[10px]">
              {active && (
                <motion.span
                  layoutId="admin-tab-active"
                  className="absolute inset-y-1.5 inset-x-1 rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}
              <span className="relative">
                <IconCmp size={21} weight={active ? "regular" : "light"} className={active ? "text-gold-200" : "text-text-2"} />
                {item.badge === "pending" && pending > 0 && (
                  <span className="tabular absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-300 px-1 text-[10px] font-bold text-[var(--on-accent)]">
                    {pending}
                  </span>
                )}
              </span>
              <span className={`relative ${active ? "text-gold-100" : "text-text-3"}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminShell({ username, children }: { username: string; children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <PulseProvider>
          <div className="relative min-h-dvh">
            <div aria-hidden className="pointer-events-none fixed right-0 top-0 h-[50vh] w-[60vw] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_7%,transparent),transparent)] blur-3xl" />
            <Sidebar username={username} />
            <MobileBar />
            <main className="relative px-4 pb-28 pt-2 lg:ml-[260px] lg:px-10 lg:pb-16 lg:pt-10">
              <div className="mx-auto max-w-[1280px]">{children}</div>
            </main>
          </div>
        </PulseProvider>
      </ToastProvider>
    </MotionConfig>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[clamp(2.2rem,4vw,3.2rem)] font-medium leading-[1] text-text">{title}</h1>
        {sub && <p className="mt-2 text-[14px] text-text-3">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
