import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Connexion gérant", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getAdminSession()) redirect(next);
  return <LoginForm next={next} isDev={process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD} />;
}
