"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useToast } from "./ui";

type Pulse = { pending: number; active: number; latestId: number };

type PulseContextValue = Pulse & {
  /** Change à chaque nouvelle commande : les pages s'en servent pour se recharger. */
  version: number;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  notificationsOn: boolean;
  enableNotifications: () => Promise<void>;
  refresh: () => void;
};

const PulseContext = createContext<PulseContextValue | null>(null);
const SOUND_KEY = "moodz-admin-sound";

/** Préférence « alerte sonore » (localStorage), lue sans décalage d'hydratation. */
const soundListeners = new Set<() => void>();
const soundStore = {
  subscribe(listener: () => void) {
    soundListeners.add(listener);
    return () => soundListeners.delete(listener);
  },
  get(): boolean {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  },
  set(on: boolean) {
    try {
      localStorage.setItem(SOUND_KEY, on ? "on" : "off");
    } catch {}
    for (const listener of soundListeners) listener();
  },
};

const noopSubscribe = () => () => {};
const notificationPermission = () => ("Notification" in window ? Notification.permission : "unsupported");

/** Carillon doux à deux notes, généré (aucun fichier audio). */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [
    [880, 0],
    [1318.5, 0.16],
    [1760, 0.32],
  ].forEach(([freq, delay]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.22, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 1.3);
  });
}

export function PulseProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const router = useRouter();
  const [pulse, setPulse] = useState<Pulse>({ pending: 0, active: 0, latestId: 0 });
  const [version, setVersion] = useState(0);
  const soundOn = useSyncExternalStore(soundStore.subscribe, soundStore.get, () => true);
  // La permission n'émet pas d'événement : on relit la valeur après chaque demande.
  const [, setPermissionCheck] = useState(0);
  const notificationsOn = useSyncExternalStore(noopSubscribe, notificationPermission, () => "default") === "granted";
  const last = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(true);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    // Débloque l'audio au premier geste (politique des navigateurs)
    const unlock = () => {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const setSoundOn = (on: boolean) => {
    soundStore.set(on);
    if (on) {
      audio.current ??= new AudioContext();
      void audio.current.resume().then(() => audio.current && playChime(audio.current));
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
    setPermissionCheck((n) => n + 1);
  };

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pulse", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as Pulse;
      setPulse(data);
      if (last.current !== null && data.latestId > last.current) {
        setVersion((v) => v + 1);
        toast("Nouvelle commande reçue", "info");
        if (soundOnRef.current && audio.current) playChime(audio.current);
        if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
          new Notification("MOODZ : nouvelle commande", { body: "Une commande attend votre confirmation.", tag: "moodz-order" });
        }
      }
      last.current = data.latestId;
    } catch {}
  }, [toast, router]);

  useEffect(() => {
    const first = window.setTimeout(poll, 0);
    const id = window.setInterval(poll, 8000);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Onglet du navigateur : nombre de commandes en attente
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = pulse.pending > 0 ? `(${pulse.pending}) ${base}` : base;
  }, [pulse.pending]);

  return (
    <PulseContext.Provider
      value={{ ...pulse, version, soundOn, setSoundOn, notificationsOn, enableNotifications, refresh: () => void poll() }}
    >
      {children}
    </PulseContext.Provider>
  );
}

export function usePulse() {
  const ctx = useContext(PulseContext);
  if (!ctx) throw new Error("usePulse doit être utilisé dans <PulseProvider>");
  return ctx;
}
