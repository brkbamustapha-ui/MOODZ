import type { OrderStatus, OrderType } from "./site-config";

export type Variant = { label: string; price: number };

export type MenuItem = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  variants: Variant[];
  tags: string[];
  isAvailable: boolean;
  isVisible: boolean;
  position: number;
};

export type Category = {
  id: number;
  name: string;
  description: string;
  icon: string;
  position: number;
  isVisible: boolean;
  items: MenuItem[];
};

/** Article tel qu'exposé au public (sans prix de revient). */
export type PublicMenuItem = Omit<MenuItem, "cost" | "isVisible" | "position">;
export type PublicCategory = Omit<Category, "items" | "isVisible" | "position"> & { items: PublicMenuItem[] };

export type OrderLine = {
  id: number;
  itemId: number | null;
  categoryName: string;
  name: string;
  variant: string | null;
  unitPrice: number;
  unitCost: number | null;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  code: string;
  status: OrderStatus;
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  address: string | null;
  tableNumber: string | null;
  notes: string | null;
  scheduledFor: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  etaMinutes: number | null;
  rejectReason: string | null;
  createdAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  items: OrderLine[];
};

/** Suivi public d'une commande (données personnelles réduites). */
export type PublicOrder = Pick<
  Order,
  | "code"
  | "status"
  | "orderType"
  | "subtotal"
  | "deliveryFee"
  | "total"
  | "etaMinutes"
  | "rejectReason"
  | "createdAt"
  | "confirmedAt"
  | "scheduledFor"
  | "tableNumber"
> & {
  firstName: string;
  items: Pick<OrderLine, "name" | "variant" | "quantity" | "lineTotal">[];
};

export type CartLine = { itemId: number; variant: string | null; quantity: number };
