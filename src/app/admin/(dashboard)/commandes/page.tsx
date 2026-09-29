import type { Metadata } from "next";
import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Commandes" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const settings = await getSettings();
  return <OrdersBoard defaultEta={settings.ordering.estimatedMinutes} restaurant={settings.restaurantName} />;
}
