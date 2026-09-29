import type { Metadata } from "next";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Revenus" };
export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const settings = await getSettings();
  return <RevenueDashboard finance={settings.finance} />;
}
