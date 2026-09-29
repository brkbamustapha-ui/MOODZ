import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[clamp(5rem,18vw,11rem)] leading-none text-transparent [-webkit-text-stroke:1px_var(--gold-400)]">404</p>
      <h1 className="mt-6 font-display text-4xl text-text">Cette page n&apos;est pas au menu</h1>
      <p className="mt-3 max-w-[40ch] text-[15px] text-text-3">Le lien est peut-être incomplet, ou la page a été déplacée.</p>
      <Link href="/" className="btn-gold mt-10 inline-flex h-13 items-center rounded-full px-8 text-[15px] font-semibold">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
