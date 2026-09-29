import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/site/OrderTracker";
import { getPublicOrder } from "@/lib/server/orders";
import { getSettings, toPublicSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/commande/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Commande ${code}`, robots: { index: false, follow: false } };
}

export default async function OrderPage({ params }: PageProps<"/commande/[code]">) {
  const { code } = await params;
  if (!/^MZ-[2-9A-HJ-NP-Z]{6}$/.test(code)) notFound();
  const [order, settings] = await Promise.all([getPublicOrder(code), getSettings()]);
  if (!order) notFound();
  return <OrderTracker initial={order} settings={toPublicSettings(settings)} />;
}
