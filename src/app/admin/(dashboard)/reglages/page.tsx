import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getAdminSession } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Réglages" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, session] = await Promise.all([getSettings(), getAdminSession()]);
  if (!session) redirect("/admin/login");
  return <SettingsForm initial={settings} username={session.username} />;
}
