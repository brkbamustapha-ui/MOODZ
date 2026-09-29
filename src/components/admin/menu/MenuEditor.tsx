"use client";

import {
  ArrowDownIcon,
  ArrowSquareOutIcon,
  ArrowUpIcon,
  BookOpenTextIcon,
  DownloadSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { api } from "@/lib/admin-api";
import { formatDA, formatPercent } from "@/lib/format";
import { ITEM_TAGS, type ItemTag } from "@/lib/site-config";
import type { Category, MenuItem } from "@/lib/types";
import { PageHeader } from "../AdminShell";
import { Badge, Button, EmptyState, IconButton, Switch, inputClass, useConfirm, useToast } from "../ui";
import { CategoryEditor, type CategoryPayload } from "./CategoryEditor";
import { ImportDialog } from "./ImportDialog";
import { ItemEditor, type ItemPayload } from "./ItemEditor";

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function priceLabel(item: MenuItem) {
  if (item.variants.length === 0) return formatDA(item.price);
  return item.variants.map((v) => `${v.label} ${formatDA(v.price)}`).join(" · ");
}

type RowActions = {
  onToggle: (item: MenuItem, key: "isAvailable" | "isVisible") => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onMove: (category: Category, index: number, delta: number) => void;
};

function ItemRow({
  item,
  category,
  index,
  showCategory,
  actions,
}: {
  item: MenuItem;
  category: Category;
  index?: number;
  showCategory?: boolean;
  actions: RowActions;
}) {
  const margin = item.cost != null && item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`group flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-line transition-colors hover:ring-line-strong sm:flex-row sm:items-center ${
        item.isVisible ? "bg-white/[0.015]" : "bg-transparent opacity-60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-[1.2rem] leading-tight text-text">{item.name}</p>
          {item.tags
            .filter((t): t is ItemTag => t in ITEM_TAGS)
            .map((t) => (
              <Badge key={t} tone={t === "signature" ? "gold" : "neutral"}>
                {t === "signature" && <SparkleIcon size={10} weight="fill" />}
                {ITEM_TAGS[t]}
              </Badge>
            ))}
          {!item.isVisible && <Badge>Masqué</Badge>}
          {showCategory && <Badge tone="info">{category.name}</Badge>}
        </div>
        {item.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-text-3">{item.description}</p>}
        <p className="tabular mt-1.5 text-[13px] text-gold-200">
          {priceLabel(item)}
          {margin != null && <span className="ml-2 text-text-3">· marge {formatPercent(margin)}</span>}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <label className="flex items-center gap-2 text-[12px] text-text-3">
          <Switch size="sm" checked={item.isAvailable} onChange={() => actions.onToggle(item, "isAvailable")} label={item.isAvailable ? "Disponible" : "Épuisé"} />
          <span className={`w-16 ${item.isAvailable ? "text-success" : "text-danger"}`}>{item.isAvailable ? "Disponible" : "Épuisé"}</span>
        </label>
        <div className="flex items-center">
          {index !== undefined && (
            <>
              <IconButton label="Monter" tone="subtle" disabled={index === 0} onClick={() => actions.onMove(category, index, -1)}>
                <ArrowUpIcon size={15} />
              </IconButton>
              <IconButton label="Descendre" tone="subtle" disabled={index === category.items.length - 1} onClick={() => actions.onMove(category, index, 1)}>
                <ArrowDownIcon size={15} />
              </IconButton>
            </>
          )}
          <IconButton label={item.isVisible ? "Masquer du site" : "Afficher sur le site"} tone="subtle" onClick={() => actions.onToggle(item, "isVisible")}>
            {item.isVisible ? <EyeIcon size={16} weight="light" /> : <EyeSlashIcon size={16} weight="light" />}
          </IconButton>
          <IconButton label="Modifier" tone="subtle" onClick={() => actions.onEdit(item)}>
            <PencilSimpleIcon size={16} weight="light" />
          </IconButton>
          <IconButton label="Supprimer" tone="danger" onClick={() => actions.onDelete(item)}>
            <TrashIcon size={16} weight="light" />
          </IconButton>
        </div>
      </div>
    </motion.li>
  );
}

export function MenuEditor({ initialMenu, isSample }: { initialMenu: Category[]; isSample: boolean }) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [menu, setMenu] = useState<Category[]>(initialMenu);
  const [selectedId, setSelectedId] = useState<number | null>(initialMenu[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [sample, setSample] = useState(isSample);
  // Chaque ouverture change la clé : l'éditeur est remonté avec des valeurs fraîches
  const [itemModal, setItemModalState] = useState<{ open: boolean; item: MenuItem | null; key: number }>({ open: false, item: null, key: 0 });
  const [categoryModal, setCategoryModalState] = useState<{ open: boolean; category: Category | null; key: number }>({
    open: false,
    category: null,
    key: 0,
  });
  const [importModal, setImportModal] = useState({ open: false, key: 0 });
  const setItemModal = (next: { open: boolean; item: MenuItem | null }) =>
    setItemModalState((prev) => ({ ...next, key: next.open ? prev.key + 1 : prev.key }));
  const setCategoryModal = (next: { open: boolean; category: Category | null }) =>
    setCategoryModalState((prev) => ({ ...next, key: next.open ? prev.key + 1 : prev.key }));
  const setImportOpen = (open: boolean) => setImportModal((prev) => ({ open, key: open ? prev.key + 1 : prev.key }));

  const reload = useCallback(async () => {
    const data = await api<{ menu: Category[] }>("/api/admin/menu");
    setMenu(data.menu);
    setSelectedId((id) => (data.menu.some((c) => c.id === id) ? id : (data.menu[0]?.id ?? null)));
    return data.menu;
  }, []);

  const selected = menu.find((c) => c.id === selectedId) ?? null;
  const totalItems = menu.reduce((n, c) => n + c.items.length, 0);
  const unavailable = menu.reduce((n, c) => n + c.items.filter((i) => !i.isAvailable).length, 0);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    return menu.flatMap((c) => c.items.filter((i) => `${i.name} ${i.description}`.toLowerCase().includes(q)).map((i) => ({ item: i, category: c })));
  }, [menu, query]);

  const fail = (e: unknown) => toast(e instanceof Error ? e.message : "Action impossible", "error");

  /* Catégories */
  const saveCategory = async (payload: CategoryPayload) => {
    if (categoryModal.category) {
      await api(`/api/admin/categories/${categoryModal.category.id}`, { method: "PATCH", json: payload });
      toast("Catégorie mise à jour");
      await reload();
    } else {
      const { id } = await api<{ id: number }>("/api/admin/categories", { method: "POST", json: payload });
      toast("Catégorie créée");
      await reload();
      setSelectedId(id);
    }
  };

  const toggleCategory = async (category: Category) => {
    setMenu((m) => m.map((c) => (c.id === category.id ? { ...c, isVisible: !c.isVisible } : c)));
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "PATCH", json: { isVisible: !category.isVisible } });
    } catch (e) {
      fail(e);
      await reload();
    }
  };

  const deleteCategory = async (category: Category) => {
    const ok = await confirm(
      "Supprimer la catégorie",
      `« ${category.name} » et ses ${category.items.length} article(s) seront supprimés définitivement. Les commandes passées restent dans l'historique.`,
    );
    if (!ok) return;
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      toast("Catégorie supprimée");
      await reload();
    } catch (e) {
      fail(e);
    }
  };

  const moveCategory = async (index: number, delta: number) => {
    const next = move(menu, index, delta);
    if (next === menu) return;
    setMenu(next);
    try {
      await api("/api/admin/reorder", { method: "POST", json: { ids: next.map((c) => c.id) } });
    } catch (e) {
      fail(e);
      await reload();
    }
  };

  /* Articles */
  const saveItem = async (payload: ItemPayload) => {
    if (itemModal.item) {
      await api(`/api/admin/items/${itemModal.item.id}`, { method: "PATCH", json: payload });
      toast("Article mis à jour");
    } else {
      await api("/api/admin/items", { method: "POST", json: payload });
      toast("Article ajouté");
    }
    await reload();
    setSelectedId(payload.categoryId);
  };

  const patchItemLocal = (id: number, patch: Partial<MenuItem>) =>
    setMenu((m) => m.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })));

  const quickToggle = async (item: MenuItem, key: "isAvailable" | "isVisible") => {
    patchItemLocal(item.id, { [key]: !item[key] });
    try {
      await api(`/api/admin/items/${item.id}`, { method: "PATCH", json: { [key]: !item[key] } });
      if (key === "isAvailable") toast(item.isAvailable ? `« ${item.name} » marqué épuisé` : `« ${item.name} » de nouveau disponible`);
    } catch (e) {
      fail(e);
      patchItemLocal(item.id, { [key]: item[key] });
    }
  };

  const deleteItem = async (item: MenuItem) => {
    const ok = await confirm("Supprimer l'article", `« ${item.name} » sera retiré de la carte. Les commandes passées restent dans l'historique.`);
    if (!ok) return;
    try {
      await api(`/api/admin/items/${item.id}`, { method: "DELETE" });
      toast("Article supprimé");
      await reload();
    } catch (e) {
      fail(e);
    }
  };

  const moveItem = async (category: Category, index: number, delta: number) => {
    const items = move(category.items, index, delta);
    if (items === category.items) return;
    setMenu((m) => m.map((c) => (c.id === category.id ? { ...c, items } : c)));
    try {
      await api("/api/admin/reorder", { method: "POST", json: { categoryId: category.id, ids: items.map((i) => i.id) } });
    } catch (e) {
      fail(e);
      await reload();
    }
  };

  const dismissSample = async () => {
    setSample(false);
    await api("/api/admin/settings", { method: "PATCH", json: { menuIsSample: false } }).catch(fail);
  };

  const rowActions: RowActions = {
    onToggle: quickToggle,
    onEdit: (item) => setItemModal({ open: true, item }),
    onDelete: deleteItem,
    onMove: moveItem,
  };

  return (
    <>
      <PageHeader
        title="La carte"
        sub={`${menu.length} catégories · ${totalItems} articles${unavailable ? ` · ${unavailable} épuisé(s)` : ""}`}
        actions={
          <>
            <Link href="/#carte" target="_blank" className="btn-ghost inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px]">
              <ArrowSquareOutIcon size={16} weight="light" /> Voir en ligne
            </Link>
            <Button onClick={() => setImportOpen(true)} icon={<DownloadSimpleIcon size={16} weight="light" />}>
              Import rapide
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {sample && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="mb-6 flex flex-col gap-3 rounded-[1.4rem] bg-[color-mix(in_oklab,var(--accent)_9%,transparent)] p-5 ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)] sm:flex-row sm:items-center"
          >
            <SparkleIcon size={22} weight="light" className="shrink-0 text-gold-200" />
            <p className="flex-1 text-[14px] leading-relaxed text-gold-50">
              Cette carte est un <strong>exemple</strong>. Remplacez-la par la vôtre : collez-la d&apos;un coup avec « Import rapide », ou modifiez
              les articles un par un.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="gold" onClick={() => setImportOpen(true)}>
                Importer ma carte
              </Button>
              <IconButton label="Masquer ce message" tone="subtle" onClick={dismissSample}>
                <XIcon size={15} />
              </IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-6 max-w-md">
        <MagnifyingGlassIcon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" />
        <input
          className={`${inputClass} rounded-full pl-10`}
          placeholder="Rechercher un article dans toute la carte"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un article"
        />
      </div>

      {searchResults ? (
        <section className="bezel">
          <div className="bezel-core p-5">
            <p className="mb-4 text-[13px] text-text-3">{searchResults.length} résultat(s)</p>
            <ul className="flex flex-col gap-2">
              {searchResults.map(({ item, category }) => (
                <ItemRow key={item.id} item={item} category={category} showCategory actions={rowActions} />
              ))}
            </ul>
          </div>
        </section>
      ) : menu.length === 0 ? (
        <EmptyState
          icon={<BookOpenTextIcon size={28} weight="thin" />}
          title="Votre carte est vide"
          text="Créez une première catégorie ou importez votre carte complète en un collage."
          action={
            <div className="flex gap-2">
              <Button variant="gold" onClick={() => setCategoryModal({ open: true, category: null })} icon={<PlusIcon size={15} />}>
                Nouvelle catégorie
              </Button>
              <Button onClick={() => setImportOpen(true)}>Import rapide</Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Catégories */}
          <section className="bezel self-start lg:sticky lg:top-10">
            <div className="bezel-core p-3">
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-text-3">Catégories</h2>
                <IconButton label="Nouvelle catégorie" onClick={() => setCategoryModal({ open: true, category: null })}>
                  <PlusIcon size={15} />
                </IconButton>
              </div>
              <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto lg:max-h-[70vh]">
                {menu.map((category, index) => {
                  const active = category.id === selectedId;
                  return (
                    <li key={category.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => setSelectedId(category.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                            : "hover:bg-white/4"
                        } ${category.isVisible ? "" : "opacity-55"}`}
                        aria-current={active}
                      >
                        <CategoryIcon name={category.icon} size={19} className={active ? "text-gold-200" : "text-gold-400"} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] text-text">{category.name}</span>
                          <span className="text-[11px] text-text-3">
                            {category.items.length} article(s){category.isVisible ? "" : " · masquée"}
                          </span>
                        </span>
                      </button>
                      <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                        <IconButton label="Monter" tone="subtle" disabled={index === 0} onClick={() => moveCategory(index, -1)}>
                          <ArrowUpIcon size={14} />
                        </IconButton>
                        <IconButton label="Descendre" tone="subtle" disabled={index === menu.length - 1} onClick={() => moveCategory(index, 1)}>
                          <ArrowDownIcon size={14} />
                        </IconButton>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Articles */}
          {selected && (
            <section className="bezel">
              <div className="bezel-core p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-gold-200 ring-1 ring-line-strong">
                      <CategoryIcon name={selected.icon} size={24} />
                    </span>
                    <div>
                      <h2 className="font-display text-3xl leading-tight text-text">{selected.name}</h2>
                      {selected.description && <p className="text-[13px] text-text-3">{selected.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Switch size="sm" label="Visible" checked={selected.isVisible} onChange={() => toggleCategory(selected)} />
                    <span className="mr-2 text-[12px] text-text-3">{selected.isVisible ? "Visible" : "Masquée"}</span>
                    <IconButton label="Modifier la catégorie" onClick={() => setCategoryModal({ open: true, category: selected })}>
                      <PencilSimpleIcon size={16} weight="light" />
                    </IconButton>
                    <IconButton label="Supprimer la catégorie" tone="danger" onClick={() => deleteCategory(selected)}>
                      <TrashIcon size={16} weight="light" />
                    </IconButton>
                    <Button variant="gold" size="sm" className="ml-1" icon={<PlusIcon size={14} weight="bold" />} onClick={() => setItemModal({ open: true, item: null })}>
                      Article
                    </Button>
                  </div>
                </div>
                {selected.items.length === 0 ? (
                  <EmptyState
                    icon={<PlusIcon size={26} weight="thin" />}
                    title="Aucun article"
                    text="Ajoutez le premier article de cette catégorie."
                    action={
                      <Button variant="gold" onClick={() => setItemModal({ open: true, item: null })}>
                        Ajouter un article
                      </Button>
                    }
                  />
                ) : (
                  <ul className="mt-5 flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {selected.items.map((item, index) => (
                        <ItemRow key={item.id} item={item} category={selected} index={index} actions={rowActions} />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <ItemEditor
        key={`item-${itemModal.key}`}
        open={itemModal.open}
        item={itemModal.item}
        categoryId={selected?.id ?? menu[0]?.id ?? 0}
        categories={menu}
        onClose={() => setItemModal({ open: false, item: null })}
        onSave={saveItem}
      />
      <CategoryEditor
        key={`category-${categoryModal.key}`}
        open={categoryModal.open}
        category={categoryModal.category}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSave={saveCategory}
      />
      <ImportDialog
        key={`import-${importModal.key}`}
        open={importModal.open}
        onClose={() => setImportOpen(false)}
        onDone={async (message) => {
          toast(message);
          setSample(false);
          await reload();
        }}
      />
      {dialog}
    </>
  );
}
