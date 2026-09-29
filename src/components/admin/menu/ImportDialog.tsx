"use client";

import { useState } from "react";
import { api } from "@/lib/admin-api";
import { formatDA } from "@/lib/format";
import type { ParseResult } from "@/lib/menu-import";
import { Button, Modal, Segmented, inputClass } from "../ui";

const EXAMPLE = `# Cafés
Espresso - 150
Cappuccino : 280 | Espresso, lait velouté

# Pizzas
Margherita - Moyenne 800 / Large 1150
Pizza MOODZ - 1400 | Crème, poulet fumé, champignons`;

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("replace");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ preview?: ParseResult; categories?: number; items?: number }>("/api/admin/import", {
        method: "POST",
        json: { text, mode, dryRun },
      });
      if (dryRun) setPreview(res.preview ?? null);
      else {
        onDone(`${res.items} articles importés dans ${res.categories} catégories`);
        setText("");
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setLoading(false);
    }
  };

  const itemCount = preview?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import rapide de la carte"
      wide
      footer={
        <>
          {error && <p className="mr-auto text-[13px] text-danger">{error}</p>}
          <Button onClick={onClose}>Fermer</Button>
          <Button onClick={() => run(true)} loading={loading && !preview} disabled={!text.trim()}>
            Aperçu
          </Button>
          <Button variant="gold" onClick={() => run(false)} loading={loading && !!preview} disabled={!preview || itemCount === 0}>
            {mode === "replace" ? "Remplacer la carte" : "Ajouter à la carte"}
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-text-2">
        Collez votre carte (par exemple copiée depuis Canva), une ligne par article avec son prix. Les titres commençant par « # », en
        MAJUSCULES ou finissant par « : » deviennent des catégories. Une description peut suivre après « | ».
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <textarea
            className={`${inputClass} min-h-[300px] font-mono text-[13px] leading-relaxed`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            placeholder={EXAMPLE}
            aria-label="Texte de la carte"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "replace", label: "Remplacer toute la carte" },
                { value: "append", label: "Ajouter à la suite" },
              ]}
            />
            {!text && (
              <button type="button" className="text-[12px] text-gold-300 underline-offset-4 hover:underline" onClick={() => setText(EXAMPLE)}>
                Insérer un exemple
              </button>
            )}
          </div>
          {mode === "replace" && <p className="mt-2 text-[12px] text-warning">Attention : les catégories et articles actuels seront supprimés.</p>}
        </div>
        <div className="max-h-[380px] overflow-y-auto rounded-2xl bg-bg/40 p-4 ring-1 ring-line">
          {!preview ? (
            <p className="py-10 text-center text-[13px] text-text-3">Cliquez sur « Aperçu » pour vérifier la lecture avant d&apos;importer.</p>
          ) : (
            <>
              <p className="text-[13px] text-text-2">
                {preview.categories.length} catégories · {itemCount} articles
              </p>
              {preview.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12px] text-warning">
                  {preview.warnings.slice(0, 8).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              {preview.categories.map((c) => (
                <div key={c.name} className="mt-4">
                  <p className="font-display text-lg text-gold-200">{c.name}</p>
                  <ul className="mt-1 space-y-0.5 text-[13px]">
                    {c.items.map((i, k) => (
                      <li key={k} className="flex justify-between gap-3">
                        <span className="text-text">
                          {i.name}
                          {i.variants.length > 0 && <span className="text-text-3"> ({i.variants.map((v) => v.label).join(", ")})</span>}
                        </span>
                        <span className={`tabular ${i.price ? "text-text-2" : "text-warning"}`}>{i.price ? formatDA(i.price) : "prix ?"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
