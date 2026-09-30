"use client";

import { EyeIcon, EyeSlashIcon, LockKeyIcon, UserIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import { AnimatedBadge } from "@/components/brand/AnimatedBadge";
import { LiquidGold } from "@/components/site/LiquidGold";
import { api } from "@/lib/admin-api";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginForm({ next, isDev }: { next: string; isDev: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Saisissez votre identifiant et votre mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api("/api/admin/login", { method: "POST", json: { username, password } });
      // Navigation complète : le tableau de bord se charge avec la nouvelle session, sans cache client
      window.location.assign(new URL(next, window.location.origin).href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setLoading(false);
    }
  };

  const field =
    "w-full rounded-2xl bg-bg/70 py-3.5 pl-12 pr-4 text-[15px] text-text shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow duration-300 placeholder:text-text-3 focus:shadow-[inset_0_0_0_1px_var(--gold-400)]";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 opacity-45 blur-[2px]">
        <LiquidGold />
      </div>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_50%,rgb(12_16_7/0.55),var(--bg)_85%)]" />

      <motion.div
        className="relative w-full max-w-[420px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE }}
      >
        <div className="bezel">
          <div className="bezel-core px-7 pb-8 pt-10 sm:px-9">
            <AnimatedBadge className="mx-auto w-[150px] text-[10px]" tagline="Espace gérant" />
            <form onSubmit={submit} className="mt-10 flex flex-col gap-4" noValidate>
              <div className="relative">
                <label htmlFor="username" className="sr-only">
                  Identifiant
                </label>
                <UserIcon size={18} weight="light" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  id="username"
                  className={field}
                  placeholder="Identifiant"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Mot de passe
                </label>
                <LockKeyIcon size={18} weight="light" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-3" />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  className={`${field} pr-12`}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-text-3 hover:text-text"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <EyeSlashIcon size={18} weight="light" /> : <EyeIcon size={18} weight="light" />}
                </button>
              </div>
              {error && (
                <p className="rounded-2xl bg-danger/10 px-4 py-3 text-[13px] text-danger ring-1 ring-danger/30" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-gold mt-2 h-13 rounded-full text-[15px] font-semibold">
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
            {isDev && (
              <p className="mt-6 text-center text-[12px] text-text-3">
                Mode développement : <span className="font-mono text-gold-200">admin</span> /{" "}
                <span className="font-mono text-gold-200">moodz2026</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
