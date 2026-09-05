import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { OperatingEvaluation } from "@/types/operation";

const MAP = {
  dentro: { color: "var(--estado-ok)", Icon: CheckCircle2 },
  limite: { color: "var(--estado-alerta)", Icon: AlertTriangle },
  fuera: { color: "var(--estado-critico)", Icon: XCircle },
} as const;

export function StatusIndicator({
  estado,
  etiqueta,
  inheritColor = false,
}: {
  estado: OperatingEvaluation["estado"];
  etiqueta?: string | undefined;
  inheritColor?: boolean;
}) {
  if (estado === "sin-datos") {
    return <span className="text-[12px] text-muted-foreground">— SIN DATOS</span>;
  }
  const { color, Icon } = MAP[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
      style={inheritColor ? undefined : { color }}
    >
      <Icon size={14} aria-hidden />
      {etiqueta ?? ""}
    </span>
  );
}