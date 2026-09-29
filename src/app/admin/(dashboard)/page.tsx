import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Overview } from "@/components/admin/Overview";
import { getOpenStatus } from "@/lib/hours";
import { getAdminSession } from "@/lib/server/auth";
import { listOrders } from "@/lib/server/orders";
import { getSettings } from "@/lib/server/settings";
import { getStats, normalizeRange } from "@/lib/server/stats";
import { todayInAlgiers } from "@/lib/format";

export const metadata: Metadata = { title: "Aperçu" };
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const today = todayInAlgiers();
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 13);
  const [settings, todayStats, trend, pending] = await Promise.all([
    getSettings(),
    getStats(normalizeRange(today, today)),
    getStats(normalizeRange(d.toISOString().slice(0, 10), today)),
    listOrders({ status: ["pending"], limit: 50 }),
  ]);

  return (
    <Overview
      username={session.username}
      initialToday={todayStats}
      initialTrend={trend}
      initialPending={pending}
      status={getOpenStatus(settings.hours)}
      orderingEnabled={settings.ordering.enabled}
      menuIsSample={settings.menuIsSample}
      defaultEta={settings.ordering.estimatedMinutes}
      restaurant={settings.restaurantName}
    />
  );
}
