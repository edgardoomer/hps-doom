import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NumberField } from "@/components/NumberField";
import { PumpData } from "@/components/PumpData";
import { PumpMenu } from "@/components/PumpMenu";
import { StatusIndicator } from "@/components/StatusIndicator";
import { useChat } from "@/context/ChatRunnerContext";
import { usePumps } from "@/context/PumpContext";
import { useSession } from "@/context/SessionContext";
import { int, num } from "@/lib/format";

export const Route = createFileRoute("/arranques")({
  head: () => ({
    meta: [
      { title: "Arranques · HPS-DOOM" },
      {
        name: "description",
        content: "Datos de locación y resumen de arranque para bombas horizontales de superficie.",
      },
      { property: "og:title", content: "Arranques · HPS-DOOM" },
      {
        property: "og:description",
        content: "Datos de locación y resumen de arranque para bombas HPS.",
      },
    ],
  }),
  component: ArranquesPage,
});

function SummaryCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel flex-1 p-3">
      <span className="panel-title">{label}</span>
      <p className="num mt-1 text-[20px] text-foreground">{value}</p>
      {children}
    </div>
  );
}

function ArranquesPage() {
  const { selectedPump } = usePumps();
  const { setActiveContext, startAnalysis, typing } = useChat();
  const { location, setLocation, startupSummary } = useSession();

  useEffect(() => setActiveContext("arranques"), [setActiveContext]);

  const completo =
    location.presionSuccion !== null &&
    location.presionARomper !== null &&
    location.caudalEsperado !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex gap-3">
        <section className="panel w-[320px] shrink-0 p-3">
          <h2 className="panel-title mb-2">DATOS DE LOCACIÓN</h2>
          <div className="flex flex-col gap-2">
            <NumberField
              label="PRESIÓN DE SUCCIÓN"
              suffix="psi.g"
              value={location.presionSuccion}
              onChange={(v) => setLocation({ ...location, presionSuccion: v })}
            />
            <NumberField
              label="PRESIÓN A ROMPER"
              suffix="psi.g"
              value={location.presionARomper}
              onChange={(v) => setLocation({ ...location, presionARomper: v })}
            />
            <NumberField
              label="CAUDAL ESPERADO"
              suffix="USbl/día"
              value={location.caudalEsperado}
              onChange={(v) => setLocation({ ...location, caudalEsperado: v })}
            />
            <button
              type="button"
              disabled={!completo || !selectedPump || typing}
              onClick={startAnalysis}
              className="mt-1 h-[32px] rounded-[6px] bg-primary px-3 text-[11px] font-medium tracking-[0.06em] text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              GENERAR ANÁLISIS DE ARRANQUE
            </button>
          </div>
        </section>

        <div className="flex min-w-0 flex-1 gap-3">
          <PumpMenu orientation="vertical-narrow" />
          <div className="min-w-0 flex-1">
            <PumpData />
          </div>
        </div>
      </div>

      <section className="panel p-3">
        <h2 className="panel-title mb-2">RESUMEN DE ARRANQUE</h2>
        <div className="flex gap-3">
          <SummaryCard
            label="MARGEN VS. PRESIÓN A ROMPER"
            value={startupSummary ? `${num(startupSummary.margenPresionARomper)} psi` : "—"}
          >
            {startupSummary && (
              <StatusIndicator
                estado={startupSummary.margenEstado}
                etiqueta={startupSummary.margenEtiqueta}
              />
            )}
          </SummaryCard>
          <SummaryCard
            label="CAUDAL ESPERADO VS. NOMINAL"
            value={startupSummary ? `${num(startupSummary.caudalVsNominal)} %` : "—"}
          >
            {startupSummary && (
              <StatusIndicator
                estado={startupSummary.caudalEstado}
                etiqueta={startupSummary.caudalEtiqueta}
              />
            )}
          </SummaryCard>
          <SummaryCard
            label="MOTOR MÍNIMO REQUERIDO"
            value={
              startupSummary
                ? `${int(startupSummary.motorMinimo.hp)} hp / ${int(startupSummary.motorMinimo.kw)} kW`
                : "—"
            }
          />
          <SummaryCard
            label="FRECUENCIA DE ARRANQUE SUGERIDA"
            value={startupSummary ? `${int(startupSummary.frecuenciaArranqueSugerida)} Hz` : "—"}
          />
        </div>
      </section>
    </div>
  );
}
