"use client";

import { useSyncExternalStore } from "react";

/** Valeur d'une media query, sans décalage d'hydratation (valeur serveur par défaut). */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

const noopSubscribe = () => () => {};

/**
 * Lit une valeur disponible uniquement dans le navigateur (primitive).
 * Le rendu serveur et l'hydratation utilisent `serverValue`, puis React bascule sur la vraie valeur.
 */
export function useClientValue<T extends string | number | boolean | null>(getter: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getter, () => serverValue);
}
