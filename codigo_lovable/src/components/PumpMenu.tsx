import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePumps } from "@/context/PumpContext";
import { useSession } from "@/context/SessionContext";

export function PumpMenu({ orientation = "vertical" }: { orientation?: "vertical" | "vertical-narrow" }) {
  const { pumps, selectedPumpId, selectPump } = usePumps();
  const { resetOperation, setStartupSummary } = useSession();
  const [open, setOpen] = useState(true);
  const activo = pumps.find((p) => p.id === selectedPumpId);

  return (
    <div className={`panel p-2 ${orientation === "vertical-narrow" ? "w-[110px]" : "w-[128px]"}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="panel-title">BOMBAS</span>
        <button
          type="button"
          aria-label={open ? "Colapsar menú de bombas" : "Expandir menú de bombas"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-[4px] p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      <div className="flex flex-col gap-1 overflow-hidden transition-all duration-150">
        {(open ? pumps : activo ? [activo] : []).map((p) => {
          const selected = p.id === selectedPumpId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                selectPump(p.id);
                resetOperation();
                setStartupSummary(null);
              }}
              aria-pressed={selected}
              className="num h-[28px] rounded-[4px] bg-secondary px-2 text-left text-[12px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={
                selected
                  ? { borderLeft: "3px solid var(--accent)", color: "var(--accent)" }
                  : { borderLeft: "3px solid transparent", color: "var(--ink-secondary)" }
              }
            >
              {p.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}