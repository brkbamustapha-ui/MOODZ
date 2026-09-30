"use client";

import { SpinnerGapIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

const EASE = [0.32, 0.72, 0, 1] as const;

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gold" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};

const sizes = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-[14px] gap-2",
  lg: "h-13 px-7 text-[15px] gap-2.5",
};

export function Button({ variant = "ghost", size = "md", loading, icon, className = "", children, disabled, ...rest }: ButtonProps) {
  const look =
    variant === "gold"
      ? "btn-gold font-semibold"
      : variant === "danger"
        ? "bg-danger/12 text-danger ring-1 ring-danger/35 hover:bg-danger/20"
        : variant === "subtle"
          ? "text-text-2 hover:bg-white/5 hover:text-text"
          : "btn-ghost";
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,transform,box-shadow,color] duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${look} ${className}`}
      {...rest}
    >
      {loading ? <SpinnerGapIcon size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  tone = "ghost",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "ghost" | "subtle" | "danger" }) {
  const look =
    tone === "danger" ? "text-text-3 hover:bg-danger/12 hover:text-danger" : tone === "subtle" ? "text-text-2 hover:bg-white/6 hover:text-text" : "btn-ghost";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 disabled:opacity-40 ${look} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Champs                                                              */
/* ------------------------------------------------------------------ */

export const inputClass =
  "w-full rounded-xl bg-bg/70 px-3.5 py-2.5 text-[14px] text-text shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none transition-shadow duration-300 placeholder:text-text-3 focus:shadow-[inset_0_0_0_1px_var(--gold-400)] disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-text-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-[12px] text-danger">{error}</p> : hint ? <p className="text-[12px] text-text-3">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ label, hint, error, className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string | null }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id}>
      <input id={id} className={inputClass} {...rest} />
    </Field>
  );
}

export function TextArea({ label, hint, error, className = "", ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; error?: string | null }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id}>
      <textarea id={id} className={`${inputClass} min-h-[90px] resize-y leading-relaxed`} {...rest} />
    </Field>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  ariaLabel,
  description,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Libellé visible à côté de l'interrupteur */
  label?: string;
  /** Libellé pour lecteurs d'écran uniquement (quand le texte visible est ailleurs) */
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-[3px] transition-colors duration-300 disabled:opacity-50 ${track} ${
        checked ? "bg-gold-400" : "bg-surface-3 ring-1 ring-line-strong"
      }`}
    >
      <span className={`block rounded-full bg-text shadow transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${knob} ${checked ? shift : "translate-x-0"}`} />
    </button>
  );
  if (!label && !description) return button;
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <p className="text-[14px] text-text">{label}</p>}
        {description && <p className="text-[12px] text-text-3">{description}</p>}
      </div>
      {button}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={`inline-flex rounded-full bg-bg/70 p-1 ring-1 ring-line ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 font-medium transition-colors duration-300 ${size === "sm" ? "h-8 text-[12px]" : "h-9 text-[13px]"} ${
            value === o.value ? "btn-gold" : "text-text-2 hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes & badges                                                     */
/* ------------------------------------------------------------------ */

export function Panel({ children, className = "", innerClassName = "" }: { children: ReactNode; className?: string; innerClassName?: string }) {
  return (
    <section className={`bezel ${className}`}>
      <div className={`bezel-core h-full p-5 sm:p-6 ${innerClassName}`}>{children}</div>
    </section>
  );
}

export function PanelTitle({ children, action, sub }: { children: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl leading-tight text-text">{children}</h2>
        {sub && <p className="mt-1 text-[13px] text-text-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "gold" | "success" | "danger" | "warning" | "info"; className?: string }) {
  const tones = {
    neutral: "text-text-2 ring-line-strong",
    gold: "text-gold-200 ring-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]",
    success: "text-success ring-success/35 bg-success/8",
    danger: "text-danger ring-danger/35 bg-danger/8",
    warning: "text-warning ring-warning/35 bg-warning/8",
    info: "text-info ring-info/35 bg-info/8",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] text-gold-300 ring-1 ring-line-strong">
        {icon}
      </span>
      <p className="mt-5 font-display text-2xl text-text">{title}</p>
      {text && <p className="mt-1.5 max-w-[36ch] text-[14px] text-text-3">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fenêtre modale                                                      */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    window.setTimeout(() => panel.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[linear-gradient(180deg,var(--surface-2),var(--surface))] shadow-[inset_0_1px_0_rgb(236_242_212/0.08),0_40px_100px_-30px_rgb(0_0_0/0.9)] ring-1 ring-line sm:rounded-[1.75rem] ${
              wide ? "sm:max-w-3xl" : "sm:max-w-lg"
            }`}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
              <h2 className="font-display text-2xl text-text">{title}</h2>
              <IconButton label="Fermer" onClick={onClose} tone="subtle">
                <XIcon size={16} />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-bg/30 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[80] flex flex-col items-end gap-2 lg:bottom-6" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.4, ease: EASE }}
              className={`glass pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-[14px] ${
                t.tone === "error" ? "text-danger" : "text-text"
              }`}
              role={t.tone === "error" ? "alert" : "status"}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${t.tone === "error" ? "bg-danger" : t.tone === "info" ? "bg-info" : "bg-gold-300"}`} />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ------------------------------------------------------------------ */
/* Confirmation                                                        */
/* ------------------------------------------------------------------ */

type ConfirmState = { title: string; message: string; confirmLabel: string; resolve: (ok: boolean) => void } | null;

/** Boîte de confirmation élégante (remplace window.confirm). */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(null);
  const confirm = useCallback(
    (title: string, message: string, confirmLabel = "Supprimer") =>
      new Promise<boolean>((resolve) => setState({ title, message, confirmLabel, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };
  const dialog = (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ""}
      footer={
        <>
          <Button onClick={() => close(false)}>Annuler</Button>
          <Button variant="danger" onClick={() => close(true)}>
            {state?.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-text-2">{state?.message}</p>
    </Modal>
  );
  return { confirm, dialog };
}
