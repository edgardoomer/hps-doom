/**
 * Límites operacionales de campo.
 *
 * A diferencia de los datos de fábrica, estos valores no salen de las fichas del
 * fabricante: los fija la operación (seteo de válvulas, protecciones del
 * variador, criterios de mantenimiento). Se editan aquí.
 */

export interface LimiteOperacional {
  id: string;
  etiqueta: string;
  valor: number;
  unidad: string;
  /** Decimales al mostrar el valor. */
  decimales?: number;
  /** Aclaración que aparece en el icono de información junto a la etiqueta. */
  nota?: string;
}

/** Límites que se aplican a todas las unidades mientras no tengan los suyos. */
export const limitesOperacionalesPorDefecto: LimiteOperacional[] = [
  {
    id: "p-descarga-max",
    etiqueta: "Presión de descarga máxima",
    valor: 2700,
    unidad: "psi",
    nota: "Depende del seteo de la válvula VRP.",
  },
  { id: "p-descarga-min", etiqueta: "Presión de descarga mínima", valor: 1000, unidad: "psi" },
  { id: "p-succion-min", etiqueta: "Presión de succión mínima", valor: 40, unidad: "psi" },
  { id: "p-succion-max", etiqueta: "Presión de succión máxima", valor: 150, unidad: "psi" },
  { id: "caudal-max", etiqueta: "Caudal máximo", valor: 12000, unidad: "BPD" },
  { id: "temp-camara", etiqueta: "T° cámara de empuje", valor: 90, unidad: "°C" },
  { id: "vibracion-max", etiqueta: "Vibración máxima", valor: 12, unidad: "mm/s" },
  { id: "p-aceite-cooler", etiqueta: "Presión de aceite del cooler", valor: 80, unidad: "psi" },
];

/** Reemplaza el valor de los límites indicados, dejando el resto por defecto. */
function conValores(cambios: Record<string, number>): LimiteOperacional[] {
  return limitesOperacionalesPorDefecto.map((l) => {
    const nuevo = cambios[l.id];
    return nuevo === undefined ? l : { ...l, valor: nuevo };
  });
}

/**
 * Límites de las unidades de transferencia. Trabajan a presiones muy por debajo
 * de las de reinyección, así que no les sirven los valores por defecto.
 */
const LIMITES_TRANSFERENCIA = conValores({
  "p-descarga-max": 680,
  "p-descarga-min": 150,
  "p-succion-max": 140,
  "caudal-max": 20000,
});

/** Unidades de transferencia (el resto del parque es de reinyección). */
const UNIDADES_TRANSFERENCIA = ["hps-07", "hps-08", "hps-09"];

/**
 * Excepciones por unidad. Cada entrada reemplaza la lista por defecto para esa
 * bomba; las unidades que no aparezcan aquí usan la lista de arriba.
 */
export const limitesOperacionalesPorBomba: Record<string, LimiteOperacional[]> = Object.fromEntries(
  UNIDADES_TRANSFERENCIA.map((id) => [id, LIMITES_TRANSFERENCIA]),
);

export function getLimitesOperacionales(pumpId: string | null): LimiteOperacional[] {
  if (!pumpId) return limitesOperacionalesPorDefecto;
  return limitesOperacionalesPorBomba[pumpId] ?? limitesOperacionalesPorDefecto;
}
