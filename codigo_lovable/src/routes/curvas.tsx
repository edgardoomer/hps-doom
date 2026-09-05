import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CurveChart } from "@/components/CurveChart";
import { NumberField } from "@/components/NumberField";
import { PumpData } from "@/components/PumpData";
import { PumpMenu } from "@/components/PumpMenu";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useChat } from "@/context/ChatRunnerContext";
import { usePumps } from "@/context/PumpContext";
import { useSession } from "@/context/SessionContext";
import { HZ_MAX } from "@/lib/pumpPhysics";
import { evaluateOperatingPoint } from "@/services/operationService";

export const Route = createFileRoute("/curvas")({
  head: () => ({
    meta: [
      { title: "Curvas de eficiencia · HPS-DOOM" },
      {
        name: "description",
        content: "Curvas de eficiencia por frecuencia y punto de operación de bombas HPS.",
      },
      { property: "og:title", content: "Curvas de eficiencia · HPS-DOOM" },
      {
        property: "og:description",
        content: "Curvas de eficiencia por frecuencia y punto de operación de bombas HPS.",
      },
    ],
  }),
  component: CurvasPage,
});

function CurvasPage() {
  const { selectedPumpId, frecuencias, addFrecuencia, resetFrecuencias } = usePumps();
  const { setActiveContext } = useChat();
  const { operation, setOperation, evaluation, setEvaluation, resetOperation } = useSession();
  const [evaluando, setEvaluando] = useState(false);

  useEffect(() => setActiveContext("curvas"), [setActiveContext]);

  const completo =
    operation.presionSuccion !== null &&
    operation.presionDescarga !== null &&
    operation.caudal !== null &&
    operation.frecuencia !== null &&
    operation.frecuencia > 0 &&
    operation.frecuencia <= HZ_MAX;

  const estado = evaluation?.estado ?? "sin-datos";
  const pill =
    estado === "dentro"
      ? { bg: "var(--estado-ok)", texto: evaluation?.etiqueta ?? "DENTRO DE CURVA" }
      : estado === "limite"
        ? { bg: "var(--estado-alerta)", texto: evaluation?.etiqueta ?? "EN EL LÍMITE" }
        : estado === "fuera"
          ? { bg: "var(--estado-critico)", texto: evaluation?.etiqueta ?? "FUERA DE CURVA" }
          : null;

  const evaluar = () => {
    if (!selectedPumpId || operation.frecuencia === null) return;
    setEvaluando(true);
    // La curva de la frecuencia evaluada tiene que estar en el gráfico: si no
    // viene dibujada en el documento de fábrica, se genera por afinidad.
    const hz = operation.frecuencia;
    if (!frecuencias.includes(hz)) addFrecuencia(hz);
    evaluateOperatingPoint(selectedPumpId, operation)
      .then((resultado) => {
        setEvaluation(resultado);
        if (
          resultado.frecuenciaEquivalente !== null &&
          Math.abs(resultado.frecuenciaEquivalente - hz) > 0.5
        ) {
          addFrecuencia(resultado.frecuenciaEquivalente);
        }
      })
      .finally(() => setEvaluando(false));
  };

  const alEnviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!completo || evaluando || !selectedPumpId) return;
    evaluar();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-start gap-3">
        <PumpMenu />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <PumpData />

          <section className="panel accent-bar p-3 pl-4">
            <h2 className="panel-title mb-2">INPUT DE OPERACIÓN ACTUAL</h2>
            {/* Es un formulario para que Enter en cualquier campo evalúe. */}
            <form onSubmit={alEnviar}>
              <div className="grid grid-cols-2 items-end gap-3 xl:grid-cols-4">
                <NumberField
                  label="PRESIÓN DE SUCCIÓN"
                  suffix="psi.g"
                  value={operation.presionSuccion}
                  onChange={(v) => setOperation({ ...operation, presionSuccion: v })}
                />
                <NumberField
                  label="PRESIÓN DE DESCARGA"
                  suffix="psi.g"
                  value={operation.presionDescarga}
                  onChange={(v) => setOperation({ ...operation, presionDescarga: v })}
                />
                <NumberField
                  label="CAUDAL"
                  suffix="USbl/día"
                  value={operation.caudal}
                  onChange={(v) => setOperation({ ...operation, caudal: v })}
                />
                <NumberField
                  label="FRECUENCIA"
                  suffix="Hz"
                  max={HZ_MAX}
                  value={operation.frecuencia}
                  onChange={(v) => setOperation({ ...operation, frecuencia: v })}
                />
              </div>
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-row flex-nowrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!completo || evaluando || !selectedPumpId}
                    style={{
                      backgroundImage: "var(--gradient-accent)",
                      boxShadow: "var(--glow-accent)",
                    }}
                    className="h-[34px] rounded-full px-5 font-mono text-[11px] font-bold tracking-[0.12em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {evaluando ? "EVALUANDO…" : "EVALUAR"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetOperation();
                      // Las curvas generadas durante la evaluación se van con el resto.
                      resetFrecuencias();
                    }}
                    className="h-[34px] rounded-full border border-border px-5 font-mono text-[11px] font-medium tracking-[0.12em] text-ink-secondary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    LIMPIAR
                  </button>
                </div>
                <div className="flex flex-col items-start gap-1.5">
                  <span className="panel-title text-[11px]">¿DENTRO DE LA CURVA?</span>
                  {pill ? (
                    <div
                      role="status"
                      className="flex h-[34px] min-w-[190px] items-center justify-center gap-2 rounded-full px-4 font-mono text-[11px] font-bold tracking-[0.12em] text-white"
                      style={{ background: pill.bg, boxShadow: `0 0 16px -4px ${pill.bg}` }}
                    >
                      <StatusIndicator estado={estado} etiqueta={pill.texto} inheritColor />
                    </div>
                  ) : (
                    <div className="flex h-[34px] min-w-[190px] items-center justify-center rounded-full border border-dashed border-border px-4 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
                      SIN EVALUAR
                    </div>
                  )}
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>

      <CurveChart />
    </div>
  );
}
