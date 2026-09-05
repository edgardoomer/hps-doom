import { useCallback, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Maximize2, Table2 } from "lucide-react";
import { FrequencyPicker } from "@/components/FrequencyPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePumps } from "@/context/PumpContext";
import { useSession } from "@/context/SessionContext";
import { int, num } from "@/lib/format";
import {
  eficienciaEnCurva,
  headEnCurva,
  magnitudesDe,
  potenciaEje,
  potenciaHidraulica,
} from "@/lib/pumpPhysics";

const SERIES = [
  "var(--serie-8)",
  "var(--serie-7)",
  "var(--serie-6)",
  "var(--serie-5)",
  "var(--serie-4)",
  "var(--serie-3)",
  "var(--serie-2)",
  "var(--serie-1)",
];

type Metrica = "head" | "eficiencia" | "potencia";

const METRICAS: Record<Metrica, { label: string; eje: string; unidad: string; decimales: number }> =
  {
    head: { label: "Head", eje: "Head diferencial (psi)", unidad: "psi", decimales: 1 },
    eficiencia: { label: "Eficiencia", eje: "Eficiencia (%)", unidad: "%", decimales: 1 },
    potencia: { label: "Potencia", eje: "Potencia al eje (hp)", unidad: "hp", decimales: 0 },
  };

const PUNTOS_GRID = 121;
const clave = (hz: number) => `f${hz}`;

/** Extremos y marcas del eje redondeados a un paso "limpio" (1, 2, 2,5 o 5 × 10ⁿ). */
function ejeRedondo(min: number, max: number): { domain: [number, number]; ticks: number[] } {
  const span = max - min || 1;
  const magnitud = 10 ** Math.floor(Math.log10(span / 5));
  const paso =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((p) => span / p <= 6) ?? magnitud * 10;
  const lo = Math.floor(min / paso) * paso;
  const hi = Math.ceil(max / paso) * paso;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + paso / 1000; v += paso) ticks.push(Math.round(v * 100) / 100);
  return { domain: [lo, hi], ticks };
}

export function CurveChart() {
  const { curves, curvaBase, hidraulica, loadingCurves, frecuencias, toggleFrecuencia } =
    usePumps();
  const { operation, evaluation } = useSession();
  const [metrica, setMetrica] = useState<Metrica>("head");
  const magnitudes = magnitudesDe(curvaBase);
  // Sólo se ofrecen las magnitudes que el documento de la bomba trae de verdad.
  const metricasVisibles = (Object.keys(METRICAS) as Metrica[]).filter((m) => magnitudes[m]);
  // Al cambiar a una bomba sin eficiencia/potencia se vuelve a Head.
  if (!magnitudes[metrica] && metrica !== "head") setMetrica("head");
  const [openTable, setOpenTable] = useState(false);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [sel, setSel] = useState<{ desde: number | null; hasta: number | null }>({
    desde: null,
    hasta: null,
  });

  /** Color estable por frecuencia: más alta = más oscura. */
  const colorOf = useCallback(
    (hz: number) => {
      const orden = [...frecuencias].sort((a, b) => b - a);
      const i = orden.indexOf(hz);
      return SERIES[(i < 0 ? 0 : i) % SERIES.length] ?? SERIES[0]!;
    },
    [frecuencias],
  );

  const sg = curvaBase?.sgBase ?? 1;

  /**
   * Una única rejilla de caudal para todas las series: así el tooltip puede
   * comparar todas las frecuencias en el mismo caudal.
   */
  const data = useMemo(() => {
    if (!curvaBase || !hidraulica || curves.length === 0) return [];
    const qTope = Math.max(...curves.map((c) => c.qMax));
    return Array.from({ length: PUNTOS_GRID }, (_, i) => {
      const caudal = (qTope * i) / (PUNTOS_GRID - 1);
      const fila: Record<string, number | null> = { caudal: Math.round(caudal) };
      for (const curva of curves) {
        const hz = curva.frecuenciaHz;
        if (caudal > curva.qMax) {
          fila[clave(hz)] = null;
          continue;
        }
        const head = headEnCurva(curvaBase, caudal, hz);
        if (metrica === "head") {
          fila[clave(hz)] = Math.round(head * 10) / 10;
          continue;
        }
        const ef = eficienciaEnCurva(hidraulica.qBep60, hidraulica.etaBep, caudal, hz);
        if (ef === null || hidraulica.etaBep === null) {
          fila[clave(hz)] = null;
        } else if (metrica === "eficiencia") {
          fila[clave(hz)] = Math.round(ef * 10) / 10;
        } else {
          const p =
            ef > hidraulica.etaBep * 0.05
              ? potenciaEje(potenciaHidraulica(caudal, head, sg), ef)
              : null;
          fila[clave(hz)] = p === null ? null : Math.round(p);
        }
      }
      return fila;
    });
  }, [curves, curvaBase, hidraulica, metrica, sg]);

  const dominioX = useMemo<[number, number]>(() => {
    if (zoom) return zoom;
    const ultimo = data[data.length - 1];
    return [0, ultimo ? Number(ultimo["caudal"] ?? 0) : 0];
  }, [zoom, data]);

  const ejeY = useMemo<{ domain: [number, number] | ["auto", "auto"]; ticks: number[] }>(() => {
    if (!data.length) return { domain: ["auto", "auto"], ticks: [] };
    let min = Infinity;
    let max = -Infinity;
    for (const fila of data) {
      const q = Number(fila["caudal"] ?? 0);
      if (q < dominioX[0] || q > dominioX[1]) continue;
      for (const curva of curves) {
        const v = fila[clave(curva.frecuenciaHz)];
        if (typeof v !== "number") continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (min === Infinity) return { domain: ["auto", "auto"], ticks: [] };
    const margen = (max - min) * 0.06;
    const { domain, ticks } = ejeRedondo(Math.max(0, min - margen), max + margen);
    return { domain: [Math.max(0, domain[0]), domain[1]], ticks };
  }, [data, curves, dominioX]);

  // Punto de operación evaluado (sólo tiene sentido sobre el eje de head).
  const marcador =
    metrica === "head" &&
    evaluation &&
    evaluation.headCalculado !== null &&
    operation.caudal !== null
      ? { caudal: operation.caudal, head: evaluation.headCalculado, estado: evaluation.estado }
      : null;

  const colorEstado =
    marcador?.estado === "dentro"
      ? "var(--estado-ok)"
      : marcador?.estado === "limite"
        ? "var(--estado-alerta)"
        : marcador?.estado === "fuera"
          ? "var(--estado-critico)"
          : "var(--operacion)";

  const curvaOperacion = curves.find((c) => c.frecuenciaHz === operation.frecuencia);
  const mcsf = curvaOperacion?.mcsf ?? null;
  const qBep = curvaOperacion?.qBep ?? null;

  const aplicarZoom = () => {
    const { desde, hasta } = sel;
    setSel({ desde: null, hasta: null });
    if (desde === null || hasta === null || desde === hasta) return;
    setZoom([Math.min(desde, hasta), Math.max(desde, hasta)]);
  };

  const fmt = (v: number) =>
    metrica === "potencia" ? int(v) : num(v, METRICAS[metrica].decimales);

  return (
    <section className="panel flex w-full shrink-0 flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title">CURVAS DE EFICIENCIA</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            role="group"
            aria-label="Magnitud del eje vertical"
            className="flex overflow-hidden rounded-[6px] border border-border"
          >
            {metricasVisibles.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetrica(m)}
                aria-pressed={metrica === m}
                className="px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                style={
                  metrica === m
                    ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
                    : { color: "var(--ink-secondary)" }
                }
              >
                {METRICAS[m].label}
              </button>
            ))}
          </div>

          {zoom ? (
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="flex items-center gap-1 rounded-[6px] border border-border px-2 py-1 text-[11px] text-ink-secondary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Maximize2 size={11} aria-hidden />
              Ver todo
            </button>
          ) : null}

          <Dialog open={openTable} onOpenChange={setOpenTable}>
            <DialogTrigger className="flex items-center gap-1 rounded-[6px] border border-border px-2 py-1 text-[11px] text-ink-secondary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Table2 size={11} aria-hidden />
              Ver tabla
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-[720px] overflow-auto">
              <DialogHeader>
                <DialogTitle className="panel-title">PUNTOS DE CURVA</DialogTitle>
              </DialogHeader>
              <table className="num w-full text-[12px]">
                <thead className="sticky top-0 bg-popover text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left">Hz</th>
                    <th className="py-1 text-left">Origen</th>
                    <th className="py-1 text-right">Caudal</th>
                    <th className="py-1 text-right">Head</th>
                    {magnitudes.eficiencia ? <th className="py-1 text-right">Eficiencia</th> : null}
                    {magnitudes.potencia ? <th className="py-1 text-right">Potencia</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {curves.flatMap((c) =>
                    c.puntos
                      .filter((_, i) => i % 4 === 0)
                      .map((p, i) => (
                        <tr key={`${c.frecuenciaHz}-${i}`} className="border-t border-border">
                          <td className="py-1" style={{ color: colorOf(c.frecuenciaHz) }}>
                            {c.frecuenciaHz}
                          </td>
                          <td className="py-1 text-[10px] text-muted-foreground">
                            {c.generada ? "afinidad" : "fábrica"}
                          </td>
                          <td className="py-1 text-right">{int(p.caudal)}</td>
                          <td className="py-1 text-right">{num(p.head)}</td>
                          {magnitudes.eficiencia ? (
                            <td className="py-1 text-right">
                              {p.eficiencia === null ? "—" : num(p.eficiencia)}
                            </td>
                          ) : null}
                          {magnitudes.potencia ? (
                            <td className="py-1 text-right">
                              {p.potencia === null ? "—" : int(p.potencia)}
                            </td>
                          ) : null}
                        </tr>
                      )),
                  )}
                </tbody>
              </table>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                Se muestra 1 de cada 4 puntos calculados. {curvaBase?.fuente}
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <FrequencyPicker colorOf={colorOf} />

      {loadingCurves ? (
        <Skeleton className="min-h-[320px] w-full flex-1" />
      ) : data.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center text-[12px] text-muted-foreground">
          Selecciona al menos una frecuencia para dibujar la curva.
        </div>
      ) : (
        <div className="aspect-[16/9] min-h-[340px] w-full select-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 28, bottom: 44, left: 52 }}
              onMouseDown={(e) =>
                e?.activeLabel != null && setSel({ desde: Number(e.activeLabel), hasta: null })
              }
              onMouseMove={(e) =>
                sel.desde !== null &&
                e?.activeLabel != null &&
                setSel((s) => ({ ...s, hasta: Number(e.activeLabel) }))
              }
              onMouseUp={aplicarZoom}
              onMouseLeave={() => setSel({ desde: null, hasta: null })}
            >
              <CartesianGrid stroke="var(--grid-line)" vertical={false} />
              <XAxis
                dataKey="caudal"
                type="number"
                domain={dominioX}
                allowDataOverflow
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--axis-line)"
                tickFormatter={(v: number) => int(v)}
                label={{
                  value: "Caudal (USbl/día)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                }}
              />
              <YAxis
                domain={ejeY.domain}
                {...(ejeY.ticks.length ? { ticks: ejeY.ticks } : {})}
                allowDataOverflow
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--axis-line)"
                tickFormatter={(v: number) => int(v)}
                label={{
                  value: METRICAS[metrica].eje,
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--axis-line)", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                itemSorter={(item) => -Number(item.value ?? 0)}
                labelFormatter={(v) => `Caudal ${int(Number(v))} USbl/día`}
                formatter={(value, name) => [
                  `${fmt(Number(value))} ${METRICAS[metrica].unidad}`,
                  String(name),
                ]}
              />

              {/* Mínimo continuo estable a la frecuencia de operación. */}
              {mcsf ? (
                <ReferenceArea
                  x1={0}
                  x2={mcsf}
                  fill="var(--estado-alerta)"
                  fillOpacity={0.09}
                  stroke="none"
                  label={{
                    value: "< MCSF",
                    position: "insideTopLeft",
                    fontSize: 9,
                    fill: "var(--muted-foreground)",
                  }}
                />
              ) : null}
              {qBep ? (
                <ReferenceLine
                  x={qBep}
                  stroke="var(--axis-line)"
                  strokeDasharray="2 4"
                  label={{
                    value: "BEP",
                    position: "top",
                    fontSize: 9,
                    fill: "var(--muted-foreground)",
                  }}
                />
              ) : null}

              {curves.map((curva) => (
                <Line
                  key={curva.frecuenciaHz}
                  type="monotone"
                  dataKey={clave(curva.frecuenciaHz)}
                  name={`${curva.frecuenciaHz} Hz${curva.generada ? " (generada)" : ""}`}
                  stroke={colorOf(curva.frecuenciaHz)}
                  strokeWidth={2}
                  strokeDasharray={curva.generada ? "5 4" : undefined}
                  strokeLinecap="round"
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}

              {marcador ? (
                <ReferenceLine x={marcador.caudal} stroke={colorEstado} strokeDasharray="4 4" />
              ) : null}
              {marcador ? (
                <ReferenceLine y={marcador.head} stroke={colorEstado} strokeDasharray="4 4" />
              ) : null}
              {marcador ? (
                <ReferenceDot
                  x={marcador.caudal}
                  y={marcador.head}
                  r={5}
                  fill={colorEstado}
                  stroke="var(--card)"
                  strokeWidth={2}
                  label={{
                    value: "OPERACIÓN ACTUAL",
                    position: "right",
                    fontSize: 10,
                    fill: colorEstado,
                  }}
                />
              ) : null}

              {sel.desde !== null && sel.hasta !== null ? (
                <ReferenceArea
                  x1={sel.desde}
                  x2={sel.hasta}
                  fill="var(--accent)"
                  fillOpacity={0.12}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
        <span>Arrastra sobre el gráfico para ampliar un tramo de caudal.</span>
        <div className="flex flex-wrap gap-2">
          {curves.map((c) => (
            <button
              key={c.frecuenciaHz}
              type="button"
              onClick={() => toggleFrecuencia(c.frecuenciaHz)}
              className="num flex items-center gap-1 rounded-[4px] px-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Quitar del gráfico"
            >
              <span
                aria-hidden
                className="inline-block h-[2px] w-4"
                style={
                  c.generada
                    ? {
                        backgroundImage: `repeating-linear-gradient(to right, ${colorOf(c.frecuenciaHz)} 0 4px, transparent 4px 7px)`,
                      }
                    : { background: colorOf(c.frecuenciaHz) }
                }
              />
              {c.frecuenciaHz} Hz
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
