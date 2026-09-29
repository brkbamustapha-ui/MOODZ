import type { CartLine } from "@/lib/types";

/**
 * Panier persistant (localStorage), exposé comme un store externe pour useSyncExternalStore :
 * pas de décalage d'hydratation et synchronisation entre onglets.
 */

const CART_KEY = "moodz-cart-v1";
const ORDERS_KEY = "moodz-orders-v1";

export type CartSnapshot = { lines: CartLine[]; recentOrders: string[] };

export type CartAction =
  | { type: "add"; itemId: number; variant: string | null; quantity: number }
  | { type: "set"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

export const lineKey = (itemId: number, variant: string | null) => `${itemId}:${variant ?? ""}`;

const EMPTY: CartSnapshot = { lines: [], recentOrders: [] };
let snapshot: CartSnapshot | null = null;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible (navigation privée) : le panier reste en mémoire
  }
}

function load(): CartSnapshot {
  const lines = read<unknown>(CART_KEY, []);
  const orders = read<unknown>(ORDERS_KEY, []);
  return {
    lines: Array.isArray(lines)
      ? lines
          .filter(
            (l): l is CartLine =>
              typeof l?.itemId === "number" && typeof l?.quantity === "number" && l.quantity > 0 && (l.variant === null || typeof l.variant === "string"),
          )
          .map((l) => ({ itemId: l.itemId, variant: l.variant ?? null, quantity: Math.min(50, Math.floor(l.quantity)) }))
      : [],
    recentOrders: Array.isArray(orders) ? orders.filter((c): c is string => typeof c === "string").slice(0, 5) : [],
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function reduce(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const key = lineKey(action.itemId, action.variant);
      if (lines.some((l) => lineKey(l.itemId, l.variant) === key)) {
        return lines.map((l) => (lineKey(l.itemId, l.variant) === key ? { ...l, quantity: Math.min(50, l.quantity + action.quantity) } : l));
      }
      return [...lines, { itemId: action.itemId, variant: action.variant, quantity: Math.min(50, action.quantity) }];
    }
    case "set":
      return action.quantity <= 0
        ? lines.filter((l) => lineKey(l.itemId, l.variant) !== action.key)
        : lines.map((l) => (lineKey(l.itemId, l.variant) === action.key ? { ...l, quantity: Math.min(50, action.quantity) } : l));
    case "remove":
      return lines.filter((l) => lineKey(l.itemId, l.variant) !== action.key);
    case "clear":
      return [];
  }
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY || e.key === ORDERS_KEY) {
        snapshot = load();
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): CartSnapshot {
    snapshot ??= load();
    return snapshot;
  },
  getServerSnapshot(): CartSnapshot {
    return EMPTY;
  },
  dispatch(action: CartAction) {
    const current = cartStore.getSnapshot();
    snapshot = { ...current, lines: reduce(current.lines, action) };
    write(CART_KEY, snapshot.lines);
    emit();
  },
  rememberOrder(code: string) {
    const current = cartStore.getSnapshot();
    snapshot = { ...current, recentOrders: [code, ...current.recentOrders.filter((c) => c !== code)].slice(0, 5) };
    write(ORDERS_KEY, snapshot.recentOrders);
    emit();
  },
};
