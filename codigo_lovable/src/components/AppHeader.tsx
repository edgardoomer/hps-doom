import { Moon, Sun } from "lucide-react";
import { usePumps } from "@/context/PumpContext";
import { useTheme } from "@/context/ThemeContext";

export function AppHeader() {
  const { selectedPump } = usePumps();
  const { theme, toggle } = useTheme();

  return (
    <header
      className="relative flex h-[52px] shrink-0 items-center border-b border-border px-4"
      style={{ backgroundImage: "var(--gradient-surface)" }}
    >
      <h1 className="font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-foreground">
        Panel de operación
      </h1>
      <div className="ml-auto flex items-center gap-2">
        <span
          className="num rounded-full px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
          style={{ backgroundImage: "var(--gradient-accent)" }}
        >
          {selectedPump?.nombre ?? "—"}
        </span>
        <button
          type="button"
          aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
          onClick={toggle}
          className="rounded-full border border-border p-1.5 text-ink-secondary transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}