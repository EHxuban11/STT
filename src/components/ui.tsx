import { ReactNode } from "react";
import clsx from "clsx";
import { ChevronDown, Info, Download, Check, Pencil, Gem } from "lucide-react";

/* ---------- Botón de acción de la barra superior ---------- */
export function TopAction({
  children,
  variant = "primary",
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "no-drag",
        variant === "primary" ? "btn-primary px-3.5 py-2 text-[13px]" : "btn-ghost"
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Pestañas segmentadas (Overview/History, etc.) ---------- */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-drag inline-flex items-center gap-1 rounded-xl bg-card p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            value === t.id
              ? "bg-accentbtn text-app shadow-soft"
              : "text-muted hover:text-ink"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tarjeta hero (banner gris suave) ---------- */
export function HeroCard({
  title,
  body,
  right,
  children,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("card-soft flex items-start gap-4", className)}>
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-bold text-ink">{title}</h3>
        {body && <p className="mt-1 text-sm text-muted">{body}</p>}
        {children && <div className="mt-4 flex items-center gap-2">{children}</div>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Insignia circular con icono (lado derecho de hero cards) ---------- */
export function IconBadge({ icon: Icon }: { icon: typeof Info }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
      <Icon size={22} />
    </div>
  );
}

/* ---------- Tarjeta de estadística ---------- */
export function StatCard({
  icon,
  value,
  label,
  delta,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  delta: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-app p-4">
      <div className="text-muted">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-ink">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
      <span className="pill w-fit bg-success/15 text-[11px] font-medium text-success">
        {delta}
      </span>
    </div>
  );
}

/* ---------- Tecla (kbd) ---------- */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* ---------- Contador de cuota "x/y label" ---------- */
export function CounterPill({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
      <span>{text}</span>
      <Info size={13} className="text-faint" />
    </div>
  );
}

/* ---------- Estado vacío ---------- */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="text-faint">{icon}</div>
      <div className="text-[15px] font-semibold text-brand">{title}</div>
      {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
    </div>
  );
}

/* ---------- Píldora Pro ---------- */
export function ProPill({ label = "Upgrade to Pro" }: { label?: string }) {
  return (
    <span className="pill border border-brand/40 bg-app text-brand">
      <Gem size={12} /> {label}
    </span>
  );
}

/* ---------- Insignia "Setup" (ámbar) para proveedores ---------- */
export function SetupBadge() {
  return (
    <button className="text-xs font-semibold text-amber-500 hover:underline">Setup</button>
  );
}

/* ---------- Fila de proveedor / modelo ---------- */
export function ProviderRow({
  logo,
  name,
  sub,
  right,
  selected,
  onClick,
}: {
  logo: ReactNode;
  name: string;
  sub?: string;
  right?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-transparent bg-accentbtn text-app"
          : "border-line bg-app hover:bg-card"
      )}
    >
      <div
        className={clsx(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
          selected ? "bg-white/10" : "bg-card"
        )}
      >
        {logo}
      </div>
      <div className="min-w-0 flex-1">
        <div className={clsx("truncate text-sm font-semibold", selected ? "text-app" : "text-ink")}>
          {name}
        </div>
        {sub && (
          <div className={clsx("truncate text-xs", selected ? "text-app/70" : "text-muted")}>
            {sub}
          </div>
        )}
      </div>
      {selected ? <Check size={18} className="text-success" /> : right}
    </button>
  );
}

export function DownloadIcon() {
  return <Download size={16} className="text-faint" />;
}

/* ---------- Fila de ajuste (label + helper + control) ---------- */
export function SettingRow({
  label,
  help,
  control,
  badge,
}: {
  label: ReactNode;
  help?: ReactNode;
  control?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {label}
          {badge}
        </div>
        {help && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{help}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

/* ---------- Switch / toggle ---------- */
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={clsx(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors",
        checked ? "bg-accentbtn" : "bg-line"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}

/* ---------- Dropdown (apariencia de select) ---------- */
export function Dropdown({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-between gap-2 rounded-xl border border-line bg-app px-3 py-2 text-sm font-medium text-ink hover:bg-card",
        className
      )}
    >
      <span className="truncate">{value}</span>
      <ChevronDown size={15} className="text-faint" />
    </button>
  );
}

/* ---------- Combo de teclas para Shortcuts ---------- */
export function KeycapCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-xs text-faint">+</span>}
          <Kbd>{k}</Kbd>
        </span>
      ))}
      <button className="btn-ghost ml-1 p-1">
        <Pencil size={13} />
      </button>
    </div>
  );
}

/* ---------- Card contenedora con borde ---------- */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-app p-1.5", className)}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}
