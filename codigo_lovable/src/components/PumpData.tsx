import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePumps } from "@/context/PumpContext";
import { getLimitesOperacionales } from "@/data/operational.data";
import { int, num } from "@/lib/format";

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px] text-[12px] leading-tight">
      <span className="flex items-center gap-1 text-ink-secondary">
        {label}
        {hint ? (
          <Tooltip>
            <TooltipTrigger aria-label={`Detalle: ${label}`} className="text-muted-foreground">
              <Info size={11} />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] text-[11px]">{hint}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <span className="num text-foreground">{value}</span>
    </div>
  );
}

const SIN_DATO = "—";

export function PumpData() {
  const { selectedPump, selectedPumpId, derivados, curvaBase, loadingPumps, error, reload } =
    usePumps();
  // El bloque de fábrica arranca plegado: en operación se consulta poco.
  const [fabricanteAbierto, setFabricanteAbierto] = useState(false);

  if (error) {
    return (
      <div className="panel p-3">
        <div
          className="flex items-center justify-between rounded-[6px] border px-2 py-1.5 text-[12px]"
          style={{ borderColor: "var(--estado-critico)", color: "var(--estado-critico)" }}
        >
          {error}
          <button type="button" onClick={reload} className="underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const punto = selectedPump?.puntoDiseno ?? null;
  const cargando = loadingPumps || !selectedPump || !derivados;
  const limites = getLimitesOperacionales(selectedPumpId);
  const mitad = Math.ceil(limites.length / 2);

  return (
    <div className="flex flex-col gap-3">
      {/* ---------- Datos de fábrica: plegable, plegado por defecto ---------- */}
      <section className="panel p-3">
        {/* Toda la barra es el disparador: título y modelo a la izquierda, flecha al extremo derecho. */}
        <h2>
          <button
            type="button"
            onClick={() => setFabricanteAbierto((v) => !v)}
            aria-expanded={fabricanteAbierto}
            aria-controls="datos-fabricante"
            className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-[6px] px-1 py-0.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="panel-title shrink-0">DATOS DE BOMBA (FABRICANTE)</span>
            {selectedPump ? (
              <span className="num min-w-0 truncate text-[11px] text-muted-foreground">
                {selectedPump.modeloBomba} · {selectedPump.etapas} etapas · {selectedPump.servicio}
              </span>
            ) : null}
            {fabricanteAbierto ? (
              <ChevronUp size={14} className="ml-auto shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown
                size={14}
                className="ml-auto shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
          </button>
        </h2>

        <div id="datos-fabricante" hidden={!fabricanteAbierto}>
          {cargando ? (
            <div className="mt-2 grid grid-cols-2 gap-x-8">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton key={i} className="my-[3px] h-[14px] w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-2 gap-x-8">
                <div>
                  <Row
                    label="Presión máxima de trabajo"
                    value={
                      derivados.presionMaximaTrabajo !== null
                        ? `${num(derivados.presionMaximaTrabajo)} psi.g`
                        : SIN_DATO
                    }
                    hint={
                      derivados.presionesCalculadas
                        ? "Calculada como head máximo × densidad máxima + presión de succión máxima; la ficha de esta unidad no la trae."
                        : "Valor de la ficha de fábrica."
                    }
                  />
                  <Row
                    label="Presión de prueba hidrostática"
                    value={
                      derivados.presionPruebaHidrostatica !== null
                        ? `${num(derivados.presionPruebaHidrostatica)} psi.g`
                        : SIN_DATO
                    }
                    hint={
                      derivados.presionesCalculadas
                        ? "1,5 × presión máxima de trabajo."
                        : "Valor de la ficha de fábrica."
                    }
                  />
                  <Row
                    label="Potencia hidráulica"
                    value={
                      derivados.potenciaHidraulica !== null
                        ? `${int(derivados.potenciaHidraulica)} hp`
                        : SIN_DATO
                    }
                  />
                  <Row
                    label="Potencia al eje (punto de diseño)"
                    value={
                      derivados.potenciaEje !== null ? `${int(derivados.potenciaEje)} hp` : SIN_DATO
                    }
                  />
                  <Row
                    label="Potencia máxima a diámetro nominal"
                    value={
                      selectedPump.potenciaMaximaDiametroNominal
                        ? `${int(selectedPump.potenciaMaximaDiametroNominal)} hp`
                        : SIN_DATO
                    }
                  />
                  <Row
                    label="Motor mínimo recomendado"
                    value={
                      selectedPump.motorMinimoRecomendado
                        ? `${int(selectedPump.motorMinimoRecomendado.hp)} hp / ${int(selectedPump.motorMinimoRecomendado.kw)} kW`
                        : SIN_DATO
                    }
                  />
                  <Row label="Motor instalado" value={selectedPump.motorInstalado ?? SIN_DATO} />
                </div>
                <div>
                  <Row
                    label="Caudal nominal"
                    value={punto ? `${num(punto.caudal)} USbl/día` : SIN_DATO}
                  />
                  <Row
                    label="Head diferencial requerido"
                    value={
                      punto?.headRequerido != null ? `${num(punto.headRequerido)} psi` : SIN_DATO
                    }
                  />
                  <Row
                    label="Head diferencial real"
                    value={punto ? `${num(punto.headReal)} psi` : SIN_DATO}
                  />
                  <Row
                    label="Presión de descarga (real)"
                    value={
                      derivados.presionDescargaReal !== null
                        ? `${num(derivados.presionDescargaReal)} psi`
                        : SIN_DATO
                    }
                  />
                  <Row
                    label="Presión de succión (nominal / máx)"
                    value={
                      punto
                        ? `${num(punto.presionSuccion.nominal)} / ${num(punto.presionSuccion.maxima)} psi.g`
                        : SIN_DATO
                    }
                  />
                  <Row
                    label="Velocidad / frecuencia nominal"
                    value={
                      punto
                        ? `${int(punto.rpm)} rpm · ${num(derivados.frecuenciaNominal, 1)} Hz`
                        : SIN_DATO
                    }
                  />
                  <Row
                    label="Eficiencia en el punto de diseño"
                    value={punto ? `${num(punto.eficiencia, 2)} %` : SIN_DATO}
                  />
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-x-8 border-t border-border pt-2">
                <div>
                  {/* BEP y MCSF sólo aparecen si vienen en la ficha de la bomba. */}
                  {derivados.qBep !== null ? (
                    <Row
                      label="Caudal del BEP"
                      value={`${int(derivados.qBep)} USbl/día`}
                      hint="Punto de mejor eficiencia a la velocidad de la unidad."
                    />
                  ) : null}
                  {derivados.mcsf !== null ? (
                    <Row
                      label="Caudal mínimo continuo estable"
                      value={`${int(derivados.mcsf)} USbl/día`}
                      hint="Por debajo de este caudal aparecen recirculación y vibración."
                    />
                  ) : null}
                  <Row label="Head máximo de la curva" value={`${num(derivados.headMaximo)} psi`} />
                </div>
                <div>
                  <Row
                    label="Fluido (SG nominal / máx · viscosidad)"
                    value={
                      punto
                        ? `${num(punto.densidad.nominal, 3)} / ${num(punto.densidad.maxima, 3)} · ${num(punto.viscosidad, 2)} cP`
                        : SIN_DATO
                    }
                  />
                </div>
              </div>

              {selectedPump.nota || curvaBase?.nota ? (
                <div
                  className="mt-2 rounded-[6px] border px-2 py-1.5 text-[11px] leading-snug"
                  style={{ borderColor: "var(--estado-alerta)", color: "var(--ink-secondary)" }}
                >
                  {selectedPump.nota ? <p>{selectedPump.nota}</p> : null}
                  {curvaBase?.nota ? (
                    <p className={selectedPump.nota ? "mt-1" : ""}>{curvaBase.nota}</p>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
                Fuente: {selectedPump.fuente}
              </p>
            </>
          )}
        </div>
      </section>

      {/* ---------- Límites de operación: siempre visibles ---------- */}
      <section className="panel p-3">
        <h2 className="panel-title mb-2">DATOS DE BOMBA (OPERACIONALES)</h2>
        <div className="grid grid-cols-2 gap-x-8">
          <div>
            {limites.slice(0, mitad).map((l) => (
              <Row
                key={l.id}
                label={l.etiqueta}
                value={`${num(l.valor, l.decimales ?? 0)} ${l.unidad}`}
                {...(l.nota ? { hint: l.nota } : {})}
              />
            ))}
          </div>
          <div>
            {limites.slice(mitad).map((l) => (
              <Row
                key={l.id}
                label={l.etiqueta}
                value={`${num(l.valor, l.decimales ?? 0)} ${l.unidad}`}
                {...(l.nota ? { hint: l.nota } : {})}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
