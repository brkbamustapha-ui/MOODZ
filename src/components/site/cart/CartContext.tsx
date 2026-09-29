"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { CartLine, PublicCategory, PublicMenuItem } from "@/lib/types";
import { cartStore, lineKey } from "./cart-store";

export { lineKey };

export type ResolvedLine = CartLine & {
  key: string;
  item: PublicMenuItem | null;
  unitPrice: number;
  lineTotal: number;
  unavailable: boolean;
};

type CartContextValue = {
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (itemId: number, variant: string | null, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  lastAdded: { name: string; at: number } | null;
  recentOrders: string[];
  rememberOrder: (code: string) => void;
  itemsById: Map<number, PublicMenuItem>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ menu, children }: { menu: PublicCategory[]; children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const [isOpen, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ name: string; at: number } | null>(null);

  const itemsById = useMemo(() => {
    const map = new Map<number, PublicMenuItem>();
    for (const c of menu) for (const i of c.items) map.set(i.id, i);
    return map;
  }, [menu]);

  const lines = useMemo<ResolvedLine[]>(
    () =>
      snapshot.lines.map((line) => {
        const item = itemsById.get(line.itemId) ?? null;
        const variant = item?.variants.find((v) => v.label === line.variant);
        const unitPrice = variant?.price ?? item?.price ?? 0;
        const variantMissing = !!item && item.variants.length > 0 && !variant;
        return {
          ...line,
          key: lineKey(line.itemId, line.variant),
          item,
          unitPrice,
          lineTotal: unitPrice * line.quantity,
          unavailable: !item || !item.isAvailable || variantMissing,
        };
      }),
    [snapshot.lines, itemsById],
  );

  const add = useCallback(
    (itemId: number, variant: string | null, quantity = 1) => {
      cartStore.dispatch({ type: "add", itemId, variant, quantity });
      const item = itemsById.get(itemId);
      if (item) setLastAdded({ name: variant ? `${item.name} (${variant})` : item.name, at: Date.now() });
    },
    [itemsById],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + (l.unavailable ? 0 : l.quantity), 0),
      subtotal: lines.reduce((n, l) => n + (l.unavailable ? 0 : l.lineTotal), 0),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQuantity: (key, quantity) => cartStore.dispatch({ type: "set", key, quantity }),
      remove: (key) => cartStore.dispatch({ type: "remove", key }),
      clear: () => cartStore.dispatch({ type: "clear" }),
      lastAdded,
      recentOrders: snapshot.recentOrders,
      rememberOrder: cartStore.rememberOrder,
      itemsById,
    }),
    [lines, isOpen, add, lastAdded, snapshot.recentOrders, itemsById],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
