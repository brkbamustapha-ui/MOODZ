"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { CATEGORY_ICONS } from "@/lib/site-config";
import type { Category } from "@/lib/types";
import { Button, Modal, Switch, TextArea, TextInput } from "../ui";

export type CategoryPayload = { name: string; description: string; icon: string; isVisible: boolean };

export function CategoryEditor({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (payload: CategoryPayload) => Promise<void>;
}) {
  // Remonté par le parent (prop `key`) à chaque ouverture
  const [draft, setDraft] = useState<CategoryPayload>(() => ({
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "fork-knife",
    isVisible: category?.isVisible ?? true,
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!draft.name.trim()) return setError("Donnez un nom à la catégorie.");
    setSaving(true);
    try {
      await onSave({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
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
      title={category ? "Modifier la catégorie" : "Nouvelle catégorie"}
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
      <div className="flex flex-col gap-5">
        <TextInput label="Nom" value={draft.name} maxLength={60} placeholder="Ex. Burgers" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <TextArea
          label="Sous-titre (facultatif)"
          value={draft.description}
          maxLength={200}
          placeholder="Ex. Servis avec frites maison."
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div>
          <p className="text-[12px] font-medium text-text-2">Icône</p>
          <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8" role="radiogroup" aria-label="Icône de la catégorie">
            {CATEGORY_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                role="radio"
                aria-checked={draft.icon === icon}
                aria-label={icon}
                onClick={() => setDraft({ ...draft, icon })}
                className={`flex aspect-square items-center justify-center rounded-xl transition-colors ${
                  draft.icon === icon ? "btn-gold" : "text-text-2 ring-1 ring-line hover:text-gold-200 hover:ring-line-strong"
                }`}
              >
                <CategoryIcon name={icon} size={20} weight={draft.icon === icon ? "regular" : "light"} />
              </button>
            ))}
          </div>
        </div>
        <Switch label="Visible sur le site" checked={draft.isVisible} onChange={(v) => setDraft({ ...draft, isVisible: v })} />
      </div>
    </Modal>
  );
}
