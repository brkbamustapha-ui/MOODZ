"use client";

import { FloppyDiskIcon, ImageIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/brand/Badge";
import { api } from "@/lib/admin-api";
import { accentTone } from "@/lib/color";
import { DAY_KEYS, DAY_LABELS, type DayKey, type SiteSettings } from "@/lib/site-config";
import { PageHeader } from "./AdminShell";
import { Button, Panel, PanelTitle, Switch, TextArea, TextInput, inputClass, useToast } from "./ui";

const ACCENTS = [
  { name: "Olive MOODZ", value: "#738C1F" },
  { name: "Olive clair", value: "#9DB04A" },
  { name: "Sauge", value: "#A7B58A" },
  { name: "Vert profond", value: "#4F6A2A" },
  { name: "Bronze", value: "#C08A4E" },
  { name: "Or champagne", value: "#D8B46A" },
];

const MAX_LOGO_BYTES = 500_000;

function NumberInput({ label, value, onChange, suffix, hint }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-text-2">{label}</span>
      <span className="relative">
        <input
          type="number"
          min={0}
          className={`${inputClass} tabular pr-12`}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-text-3">{suffix}</span>}
      </span>
      {hint && <span className="text-[12px] text-text-3">{hint}</span>}
    </label>
  );
}

export function SettingsForm({ initial, username }: { initial: SiteSettings; username: string }) {
  const toast = useToast();
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(initial);
  const [saved, setSaved] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Compte
  const [account, setAccount] = useState({ currentPassword: "", username, newPassword: "", confirm: "" });
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const setOrdering = <K extends keyof SiteSettings["ordering"]>(key: K, value: SiteSettings["ordering"][K]) =>
    setSettings((s) => ({ ...s, ordering: { ...s.ordering, [key]: value } }));
  const setDay = (day: DayKey, patch: Partial<SiteSettings["hours"][DayKey]>) =>
    setSettings((s) => ({ ...s, hours: { ...s.hours, [day]: { ...s.hours[day], ...patch } } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ settings: SiteSettings }>("/api/admin/settings", { method: "PUT", json: settings });
      setSettings(res.settings);
      setSaved(res.settings);
      document.documentElement.style.setProperty("--accent", res.settings.theme.accent);
      document.documentElement.dataset.accentTone = accentTone(res.settings.theme.accent);
      toast("Réglages enregistrés, le site est à jour");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Enregistrement impossible", "error");
    } finally {
      setSaving(false);
    }
  };

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return toast("Format accepté : PNG, JPG, WebP ou SVG", "error");
    if (file.size > MAX_LOGO_BYTES) return toast("Logo trop lourd (500 Ko maximum)", "error");
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveAccount = async () => {
    setAccountError(null);
    if (!account.currentPassword) return setAccountError("Saisissez votre mot de passe actuel.");
    if (account.newPassword && account.newPassword.length < 8) return setAccountError("Le nouveau mot de passe doit faire au moins 8 caractères.");
    if (account.newPassword !== account.confirm) return setAccountError("Les deux mots de passe ne correspondent pas.");
    setSavingAccount(true);
    try {
      await api("/api/admin/account", {
        method: "PUT",
        json: {
          currentPassword: account.currentPassword,
          username: account.username.trim() || undefined,
          newPassword: account.newPassword || undefined,
        },
      });
      setAccount({ currentPassword: "", username: account.username.trim().toLowerCase(), newPassword: "", confirm: "" });
      toast("Compte mis à jour");
      router.refresh();
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : "Mise à jour impossible");
    } finally {
      setSavingAccount(false);
    }
  };

  const { ordering } = settings;

  return (
    <>
      <PageHeader title="Réglages" sub="Informations du restaurant, horaires, commandes en ligne, apparence et compte." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelTitle sub="Affiché sur le site public.">Établissement</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Nom" value={settings.restaurantName} maxLength={40} onChange={(e) => set("restaurantName", e.target.value)} />
            <TextInput label="Accroche" value={settings.tagline} maxLength={60} onChange={(e) => set("tagline", e.target.value)} hint="Ex. Café · Restaurant" />
            <TextArea label="Phrase d'accueil (sous le logo)" value={settings.heroSubtitle} maxLength={160} onChange={(e) => set("heroSubtitle", e.target.value)} className="sm:col-span-2" />
            <TextInput label="Titre de présentation" value={settings.aboutTitle} maxLength={80} onChange={(e) => set("aboutTitle", e.target.value)} className="sm:col-span-2" />
            <TextArea label="Texte de présentation" value={settings.aboutText} maxLength={900} onChange={(e) => set("aboutText", e.target.value)} className="sm:col-span-2" />
          </div>
        </Panel>

        <Panel>
          <PanelTitle sub="Pour vous appeler et vous trouver.">Contact et réseaux</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Adresse" value={settings.address} maxLength={160} onChange={(e) => set("address", e.target.value)} className="sm:col-span-2" />
            <TextInput
              label="Lien Google Maps"
              value={settings.mapsUrl}
              onChange={(e) => set("mapsUrl", e.target.value)}
              className="sm:col-span-2"
              hint="Ouvrez votre fiche dans Google Maps, touchez Partager, puis collez le lien ici."
            />
            <TextInput label="Téléphone" type="tel" value={settings.phone} maxLength={30} onChange={(e) => set("phone", e.target.value)} placeholder="Ex. 0555 12 34 56" />
            <TextInput label="WhatsApp" type="tel" value={settings.whatsapp} maxLength={30} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Ex. 0555 12 34 56" />
            <TextInput label="Instagram" value={settings.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://www.instagram.com/..." />
            <TextInput label="TikTok" value={settings.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder="https://www.tiktok.com/@..." />
          </div>
        </Panel>

        <Panel>
          <PanelTitle
            sub="Heure d'Oran. Une fermeture après minuit (ex. 01:00) est gérée."
            action={
              <Button
                size="sm"
                variant="subtle"
                onClick={() => setSettings((s) => ({ ...s, hours: Object.fromEntries(DAY_KEYS.map((d) => [d, { ...s.hours.mon }])) as SiteSettings["hours"] }))}
              >
                Copier lundi partout
              </Button>
            }
          >
            Horaires
          </PanelTitle>
          <ul className="flex flex-col gap-2">
            {DAY_KEYS.map((day) => {
              const h = settings.hours[day];
              return (
                <li key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2 ring-1 ring-line">
                  <span className="w-[5.5rem] text-[14px] text-text">{DAY_LABELS[day]}</span>
                  <Switch size="sm" ariaLabel={`${DAY_LABELS[day]} : ouvert`} checked={!h.closed} onChange={(open) => setDay(day, { closed: !open })} />
                  {h.closed ? (
                    <span className="text-[13px] text-text-3">Fermé</span>
                  ) : (
                    <span className="ml-auto flex items-center gap-2">
                      <input
                        type="time"
                        className={`${inputClass} tabular w-[7.25rem] px-2.5 py-1.5`}
                        value={h.open}
                        onChange={(e) => setDay(day, { open: e.target.value })}
                        aria-label={`Ouverture ${DAY_LABELS[day]}`}
                      />
                      <span className="text-text-3">à</span>
                      <input
                        type="time"
                        className={`${inputClass} tabular w-[7.25rem] px-2.5 py-1.5`}
                        value={h.close}
                        onChange={(e) => setDay(day, { close: e.target.value })}
                        aria-label={`Fermeture ${DAY_LABELS[day]}`}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelTitle sub="Chaque commande reste à confirmer manuellement.">Commandes en ligne</PanelTitle>
          <div className="flex flex-col gap-4">
            <Switch
              label="Accepter les commandes en ligne"
              description="Désactivez pour suspendre temporairement (coup de feu, fermeture exceptionnelle)."
              checked={ordering.enabled}
              onChange={(v) => setOrdering("enabled", v)}
            />
            <Switch
              label="Accepter hors horaires d'ouverture"
              description="Utile pour les commandes programmées à l'avance."
              checked={ordering.allowWhenClosed}
              onChange={(v) => setOrdering("allowWhenClosed", v)}
            />
            <div className="grid gap-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-line sm:grid-cols-3">
              <Switch label="À emporter" checked={ordering.pickup} onChange={(v) => setOrdering("pickup", v)} />
              <Switch label="Livraison" checked={ordering.delivery} onChange={(v) => setOrdering("delivery", v)} />
              <Switch label="Sur place" checked={ordering.dineIn} onChange={(v) => setOrdering("dineIn", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput label="Frais de livraison" value={ordering.deliveryFee} onChange={(n) => setOrdering("deliveryFee", n)} suffix="DA" />
              <NumberInput label="Livraison offerte dès" value={ordering.freeDeliveryFrom} onChange={(n) => setOrdering("freeDeliveryFrom", n)} suffix="DA" hint="0 = jamais offerte" />
              <NumberInput label="Minimum pour la livraison" value={ordering.minDeliveryOrder} onChange={(n) => setOrdering("minDeliveryOrder", n)} suffix="DA" />
              <NumberInput label="Délai habituel" value={ordering.estimatedMinutes} onChange={(n) => setOrdering("estimatedMinutes", Math.min(240, Math.max(5, n)))} suffix="min" />
            </div>
            <TextArea label="Message affiché au moment de commander" value={ordering.notice} maxLength={240} onChange={(e) => setOrdering("notice", e.target.value)} />
          </div>
        </Panel>

        <Panel>
          <PanelTitle sub="La couleur d'accent s'applique aux boutons, titres et effets du site et du tableau de bord. Le logo garde ses couleurs.">Apparence</PanelTitle>
          <p className="mb-2 text-[12px] font-medium text-text-2">Couleur d&apos;accent</p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => set("theme", { accent: a.value })}
                aria-pressed={settings.theme.accent.toLowerCase() === a.value.toLowerCase()}
                className={`flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px] ring-1 transition-colors ${
                  settings.theme.accent.toLowerCase() === a.value.toLowerCase() ? "text-text ring-gold-300" : "text-text-2 ring-line hover:ring-line-strong"
                }`}
              >
                <span className="h-7 w-7 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]" style={{ background: a.value }} />
                {a.name}
              </button>
            ))}
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px] text-text-2 ring-1 ring-line hover:ring-line-strong">
              <input type="color" className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" value={settings.theme.accent} onChange={(e) => set("theme", { accent: e.target.value.toUpperCase() })} />
              Sur mesure
            </label>
          </div>
          <div
            className="accent-scope mt-5 rounded-2xl bg-bg p-6 ring-1 ring-line"
            style={{ ["--accent" as string]: settings.theme.accent }}
            data-accent-tone={accentTone(settings.theme.accent)}
          >
            <Badge className="mx-auto h-20 w-20" compact />
            <div className="mt-5 flex justify-center gap-2">
              <span className="btn-gold inline-flex h-10 items-center rounded-full px-5 text-[13px] font-semibold">Commander</span>
              <span className="btn-ghost inline-flex h-10 items-center rounded-full px-5 text-[13px]">La carte</span>
            </div>
          </div>

          <p className="mb-2 mt-6 text-[12px] font-medium text-text-2">Votre logo (facultatif)</p>
          <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-line">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg ring-1 ring-line">
              {settings.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoDataUrl} alt="Logo actuel" className="h-full w-full object-contain p-1" />
              ) : (
                <ImageIcon size={22} weight="thin" className="text-text-3" />
              )}
            </span>
            <div className="min-w-0 flex-1 text-[12px] text-text-3">
              PNG, SVG ou WebP sur fond transparent, 500 Ko maximum. Il remplace le badge MOODZ dans la navigation et devient un médaillon 3D sur la page d&apos;accueil.
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
              <Button size="sm" icon={<UploadSimpleIcon size={14} />} onClick={() => fileRef.current?.click()}>
                Choisir
              </Button>
              {settings.logoDataUrl && (
                <Button size="sm" variant="subtle" icon={<TrashIcon size={14} />} onClick={() => set("logoDataUrl", null)}>
                  Retirer
                </Button>
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelTitle sub="Identifiant et mot de passe de l'espace gérant.">Compte</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Nom d'utilisateur" value={account.username} autoComplete="username" onChange={(e) => setAccount({ ...account, username: e.target.value })} />
            <TextInput
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              value={account.currentPassword}
              onChange={(e) => setAccount({ ...account, currentPassword: e.target.value })}
            />
            <TextInput
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={account.newPassword}
              onChange={(e) => setAccount({ ...account, newPassword: e.target.value })}
              hint="8 caractères minimum. Laissez vide pour ne pas le changer."
            />
            <TextInput label="Confirmer" type="password" autoComplete="new-password" value={account.confirm} onChange={(e) => setAccount({ ...account, confirm: e.target.value })} />
          </div>
          {accountError && <p className="mt-3 text-[13px] text-danger">{accountError}</p>}
          <div className="mt-5 flex justify-end">
            <Button variant="gold" loading={savingAccount} onClick={saveAccount}>
              Mettre à jour le compte
            </Button>
          </div>
        </Panel>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="fixed inset-x-3 bottom-24 z-40 flex justify-center lg:bottom-6 lg:left-[260px]"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="glass flex items-center gap-3 rounded-full py-2 pl-5 pr-2">
              <span className="text-[13px] text-text-2">Modifications non enregistrées</span>
              <Button size="sm" variant="subtle" onClick={() => setSettings(saved)}>
                Annuler
              </Button>
              <Button size="sm" variant="gold" loading={saving} onClick={save} icon={<FloppyDiskIcon size={15} />}>
                Enregistrer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
