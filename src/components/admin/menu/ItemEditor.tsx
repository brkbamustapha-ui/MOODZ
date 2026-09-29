"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { formatDA, formatPercent } from "@/lib/format";
import { ITEM_TAGS, type ItemTag } from "@/lib/site-config";
import type { Category, MenuItem, Variant } from "@/lib/types";
import { Button, Field, IconButton, Modal, Switch, TextArea, TextInput, inputClass } from "../ui";

export type ItemDraft = {
  categoryId: number;
  name: string;
  description: string;
  price: string;
  cost: string;
  variants: { label: string; price: string }[];
  tags: ItemTag[];
  isAvailable: boolean;
  isVisible: boolean;
};

function toDraft(item: MenuItem | null, categoryId: number): ItemDraft {
  return {
    categoryId: item?.categoryId ?? categoryId,
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? String(item.price) : "",
    cost: item?.cost != null ? String(item.cost) : "",
    variants: (item?.variants ?? []).map((v) => ({ label: v.label, price: String(v.price) })),
    tags: (item?.tags ?? []).filter((t): t is ItemTag => t in ITEM_TAGS),
    isAvailable: item?.isAvailable ?? true,
    isVisible: item?.isVisible ?? true,
  };
}

const toInt = (value: string) => {
  const n = Number(value.replace(/[\s  ]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

export type ItemPayload = {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  variants: Variant[];
  tags: ItemTag[];
  isAvailable: boolean;
  isVisible: boolean;
};

/** Le parent remonte ce composant (prop `key`) à chaque ouverture : le brouillon repart des bonnes valeurs. */
export function ItemEditor({
  open,
  item,
  categoryId,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  item: MenuItem | null;
  categoryId: number;
  categories: Category[];
  onClose: () => void;
  onSave: (payload: ItemPayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ItemDraft>(() => toDraft(item, categoryId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const variants = draft.variants.filter((v) => v.label.trim() || v.price.trim());
  const hasVariants = variants.length > 0;
  const price = hasVariants ? Math.min(...variants.map((v) => toInt(v.price)).filter((n) => !Number.isNaN(n))) : toInt(draft.price);
  const cost = draft.cost.trim() ? toInt(draft.cost) : null;
  const margin = cost != null && Number.isFinite(price) && price > 0 ? ((price - cost) / price) * 100 : null;

  const submit = async () => {
    setError(null);
    if (!draft.name.trim()) return setError("Donnez un nom à l'article.");
    if (hasVariants) {
      if (variants.some((v) => !v.label.trim() || Number.isNaN(toInt(v.price)) || toInt(v.price) < 0)) {
        return setError("Chaque option doit avoir un nom et un prix.");
      }
    } else if (Number.isNaN(price) || price < 0) {
      return setError("Indiquez un prix valide (en DA).");
    }
    if (cost != null && (Number.isNaN(cost) || cost < 0)) return setError("Le prix de revient est invalide.");
    setSaving(true);
    try {
      await onSave({
        categoryId: draft.categoryId,
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: Number.isFinite(price) ? price : 0,
        cost,
        variants: variants.map((v) => ({ label: v.label.trim(), price: toInt(v.price) })),
        tags: draft.tags,
        isAvailable: draft.isAvailable,
        isVisible: draft.isVisible,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Modifier l'article" : "Nouvel article"}
      wide
      footer={
        <>
          {error && <p className="mr-auto text-[13px] text-danger">{error}</p>}
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="gold" loading={saving} onClick={submit}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Nom" value={draft.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Burger MOODZ" className="sm:col-span-2" />
        <TextArea
          label="Description (facultatif)"
          value={draft.description}
          maxLength={280}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Ingrédients, accompagnement..."
          className="sm:col-span-2"
        />
        <Field label="Catégorie">
          <select className={inputClass} value={draft.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <TextInput
          label={hasVariants ? "Prix (défini par les options)" : "Prix de vente (DA)"}
          inputMode="numeric"
          value={hasVariants ? (Number.isFinite(price) ? String(price) : "") : draft.price}
          disabled={hasVariants}
          onChange={(e) => set("price", e.target.value)}
          placeholder="Ex. 950"
        />
        <TextInput
          label="Prix de revient (DA, facultatif)"
          inputMode="numeric"
          value={draft.cost}
          onChange={(e) => set("cost", e.target.value)}
          placeholder="Coût matières"
          hint={
            margin != null ? (
              <span>
                Marge : <span className={margin >= 60 ? "text-success" : margin >= 40 ? "text-gold-200" : "text-warning"}>{formatPercent(margin)}</span> ·{" "}
                {formatDA(price - (cost ?? 0))} par vente
              </span>
            ) : (
              "Sert au calcul de la marge dans Revenus. Jamais affiché aux clients."
            )
          }
        />
        <div className="flex flex-col justify-end gap-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-line">
          <Switch label="Disponible" description="Décochez si l'article est épuisé" checked={draft.isAvailable} onChange={(v) => set("isAvailable", v)} />
          <Switch label="Visible sur le site" description="Masquer sans supprimer" checked={draft.isVisible} onChange={(v) => set("isVisible", v)} />
        </div>

        <div className="sm:col-span-2">
          <p className="text-[12px] font-medium text-text-2">Options et tailles (facultatif)</p>
          <p className="mt-0.5 text-[12px] text-text-3">Ex. Moyenne / Large, ou parfums. Le client choisit l&apos;option en ajoutant l&apos;article.</p>
          <div className="mt-3 flex flex-col gap-2">
            {draft.variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  placeholder="Nom de l'option"
                  value={v.label}
                  maxLength={40}
                  aria-label={`Nom de l'option ${i + 1}`}
                  onChange={(e) => set("variants", draft.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  className={`${inputClass} max-w-[140px]`}
                  placeholder="Prix DA"
                  inputMode="numeric"
                  value={v.price}
                  aria-label={`Prix de l'option ${i + 1}`}
                  onChange={(e) => set("variants", draft.variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                />
                <IconButton label="Supprimer l'option" tone="danger" onClick={() => set("variants", draft.variants.filter((_, j) => j !== i))}>
                  <TrashIcon size={16} weight="light" />
                </IconButton>
              </div>
            ))}
            {draft.variants.length < 8 && (
              <Button size="sm" className="self-start" icon={<PlusIcon size={14} />} onClick={() => set("variants", [...draft.variants, { label: "", price: "" }])}>
                Ajouter une option
              </Button>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="text-[12px] font-medium text-text-2">Étiquettes</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(ITEM_TAGS) as ItemTag[]).map((tag) => {
              const on = draft.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("tags", on ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag])}
                  className={`h-9 rounded-full px-3.5 text-[13px] ${on ? "btn-gold font-medium" : "btn-ghost"}`}
                >
                  {ITEM_TAGS[tag]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-text-3">« Signature » met l&apos;article en avant sur la page d&apos;accueil (5 maximum affichés).</p>
        </div>
      </div>
    </Modal>
  );
}
