import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { usePumps } from "@/context/PumpContext";
import { HZ_MAX } from "@/lib/pumpPhysics";

const HZ_MIN = 20;

/**
 * Selector de frecuencias del gráfico: alterna las que trae el documento de
 * fábrica y genera por afinidad cualquier otra que el usuario necesite.
 */
export function FrequencyPicker({ colorOf }: { colorOf: (hz: number) => string }) {
  const {
    frecuencias,
    frecuenciasDocumentadas,
    curves,
    toggleFrecuencia,
    addFrecuencia,
    resetFrecuencias,
  } = usePumps();
  const [nueva, setNueva] = useState(55);

  const generadas = frecuencias.filter((f) => !frecuenciasDocumentadas.includes(f));
  const yaExiste = frecuencias.includes(nueva);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="panel-title mr-0.5 text-[10px]">FRECUENCIAS</span>
        {frecuenciasDocumentadas.map((hz) => {
          const activa = frecuencias.includes(hz);
          return (
            <button
              key={hz}
              type="button"
              onClick={() => toggleFrecuencia(hz)}
              aria-pressed={activa}
              title={`${hz} Hz — curva del documento de fábrica`}
              className="num rounded-full border px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={
                activa
                  ? { borderColor: colorOf(hz), color: colorOf(hz), background: "var(--secondary)" }
                  : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
              }
            >
              <span
                aria-hidden
                className="mr-1 inline-block h-[2px] w-3 align-middle"
                style={{ background: activa ? colorOf(hz) : "var(--border)" }}
              />
              {hz} Hz
            </button>
          );
        })}

        {generadas.map((hz) => (
          <button
            key={hz}
            type="button"
            onClick={() => toggleFrecuencia(hz)}
            title={`${hz} Hz — generada por leyes de afinidad`}
            className="num rounded-full border border-dashed px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ borderColor: colorOf(hz), color: colorOf(hz), background: "var(--secondary)" }}
          >
            <span
              aria-hidden
              className="mr-1 inline-block h-[2px] w-3 align-middle"
              style={{
                backgroundImage: `repeating-linear-gradient(to right, ${colorOf(hz)} 0 3px, transparent 3px 5px)`,
              }}
            />
            {hz} Hz ×
          </button>
        ))}

        <button
          type="button"
          onClick={resetFrecuencias}
          title="Volver al juego de frecuencias del documento"
          className="ml-auto flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-secondary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw size={11} aria-hidden />
          Restablecer
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-[8px] border border-dashed border-border px-2 py-1.5">
        <label htmlFor="hz-nueva" className="panel-title shrink-0 text-[10px]">
          GENERAR CURVA
        </label>
        <input
          id="hz-nueva"
          type="range"
          min={HZ_MIN}
          max={HZ_MAX}
          step={0.5}
          value={nueva}
          onChange={(e) => setNueva(Number(e.target.value))}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--accent)]"
          aria-label="Frecuencia a generar"
        />
        <input
          type="number"
          min={HZ_MIN}
          max={HZ_MAX}
          step={0.5}
          value={nueva}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) setNueva(Math.min(HZ_MAX, Math.max(HZ_MIN, v)));
          }}
          aria-label="Frecuencia a generar, Hz"
          className="num w-[62px] shrink-0 rounded-[6px] border border-input bg-background px-1.5 py-0.5 text-right text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground">Hz</span>
        <button
          type="button"
          disabled={yaExiste}
          onClick={() => addFrecuencia(nueva)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-secondary transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={11} aria-hidden />
          {yaExiste ? "Ya está" : "Añadir"}
        </button>
      </div>

      <p className="text-[10.5px] leading-snug text-muted-foreground">
        {curves.filter((c) => c.generada).length > 0
          ? "Las curvas a trazo discontinuo se generan con leyes de afinidad (Q∝N, H∝N², P∝N³) a partir de la curva de fábrica de 60 Hz."
          : "Todas las curvas visibles vienen dibujadas en el documento de fábrica."}
      </p>
    </div>
  );
}
