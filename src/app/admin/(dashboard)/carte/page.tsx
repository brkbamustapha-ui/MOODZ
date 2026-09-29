import type { Metadata } from "next";
import { MenuEditor } from "@/components/admin/menu/MenuEditor";
import { getAdminMenu } from "@/lib/server/menu";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "La carte" };
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getAdminMenu(), getSettings()]);
  return <MenuEditor initialMenu={menu} isSample={settings.menuIsSample} />;
}
