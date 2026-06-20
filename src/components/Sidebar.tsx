import { NavLink } from "react-router-dom";
import {
  Home,
  BarChart3,
  Mic,
  Boxes,
  BookOpen,
  Workflow,
  Settings,
  HelpCircle,
  PanelLeft,
} from "lucide-react";
import clsx from "clsx";
import { Logo } from "./Logo";

const mainNav = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/transcribe", label: "Transcribe", icon: Mic },
  { to: "/speech-models", label: "Speech models", icon: Boxes },
  { to: "/dictionary", label: "Dictionary", icon: BookOpen },
  { to: "/workflows", label: "Workflows", icon: Workflow },
];

function Item({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors",
          isActive
            ? "bg-card font-semibold text-ink"
            : "font-medium text-muted hover:bg-card/60 hover:text-ink"
        )
      }
    >
      <Icon size={18} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col bg-sidebar">
      {/* Cabecera: colapsar + logo */}
      <div className="drag-region flex h-12 items-center gap-2 px-3">
        <button className="no-drag btn-ghost" title="Collapse sidebar">
          <PanelLeft size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4 pt-1">
        <Logo size={28} />
        <span className="text-[15px] font-bold leading-tight tracking-tight text-ink">
          Yawning Face
        </span>
      </div>

      {/* Navegación principal */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {mainNav.map((n) => (
          <Item key={n.to} {...n} />
        ))}
      </nav>

      {/* Pie: Settings / Help */}
      <div className="flex flex-col gap-1 px-3 pb-4">
        <Item to="/settings" label="Settings" icon={Settings} />
        <Item to="/help" label="Help" icon={HelpCircle} />
      </div>
    </aside>
  );
}
