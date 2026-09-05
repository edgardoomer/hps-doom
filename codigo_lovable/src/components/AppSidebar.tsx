import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BookOpen, Gauge, Sparkles } from "lucide-react";
import { VERSION } from "@/lib/version";

const ITEMS = [
  { to: "/curvas", label: "Curvas de eficiencia", icon: Gauge, code: "01" },
  { to: "/arranques", label: "Arranques", icon: Activity, code: "02" },
  { to: "/documentacion", label: "Documentación", icon: BookOpen, code: "03" },
  { to: "/creditos", label: "Créditos", icon: Sparkles, code: "04" },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex w-[212px] shrink-0 flex-col border-r border-border bg-card p-3">
      <div className="mb-4 flex items-center gap-2 px-2 pt-1">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[11px] font-bold text-accent-foreground"
          style={{ backgroundImage: "var(--gradient-accent)" }}
        >
          H
        </span>
        <span className="text-gradient font-mono text-[13px] font-bold tracking-[0.08em]">
          HPS-DOOM
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className="group relative flex items-center gap-3 overflow-hidden rounded-[10px] border px-3 py-3 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={
                active
                  ? {
                      backgroundImage: "var(--gradient-accent)",
                      color: "var(--accent-foreground)",
                      borderColor: "transparent",
                      boxShadow: "var(--glow-accent)",
                    }
                  : {
                      color: "var(--ink-secondary)",
                      borderColor: "var(--border)",
                      backgroundColor: "var(--secondary)",
                    }
              }
            >
              <Icon size={16} className="shrink-0 opacity-90" />
              <span className="min-w-0 leading-tight">{item.label}</span>
              <span className="num ml-auto text-[10px] opacity-50">{item.code}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto rounded-[10px] border border-border bg-secondary px-3 py-2">
        <span className="panel-title">HPS-DOOM {VERSION}</span>
        <p className="mt-1 text-[11px] text-muted-foreground">Monitoreo de bombas de superficie</p>
      </div>
    </nav>
  );
}
