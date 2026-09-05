/**
 * Fachada tipada de los diccionarios de contexto.
 *
 * Los tres archivos de conocimiento (`evaluacion.js`, `eventos.js` y
 * `glosario.js`) se mantienen en JavaScript a propósito: los edita quien
 * conoce las bombas, no quien conoce TypeScript. Este módulo es la única
 * frontera donde se les pone tipo, para que el resto de la aplicación los
 * consuma sin castings sueltos.
 *
 * Si añades campos a los diccionarios, decláralos aquí.
 */
import * as evaluacionJs from "./evaluacion.js";
import * as eventosJs from "./eventos.js";
import * as glosarioJs from "./glosario.js";

export interface EmpujeAxial {
  tipo: string;
  severidad: string;
  porQue: string;
}

export interface Consideracion {
  id: string;
  bloque: string;
  titulo: string;
  condicion: string;
  estado: "fuera" | "limite" | "ninguno";
  mensaje: string;
  significado: string;
  causas: string[];
  acciones: string[];
  riesgo: string;
  empujeAxial: EmpujeAxial;
  danos?: string[];
  eventos?: string[];
  glosario?: string[];
  pendienteDeImplementar?: boolean;
}

export interface Dano {
  id: string;
  titulo: string;
  tipo: string;
  gravedad: "leve" | "moderado" | "grave" | "terminal";
  queLePasaALaBomba: string;
  comoSeDetecta: string;
  ventanaDeTiempo: string;
  derivaEn?: string[];
}

export interface Evento {
  id: string;
  titulo: string;
  familia: string;
  urgencia: string;
  preguntaGuia: string;
  significado: string;
  causas: string[];
  verificar: string[];
  acciones: string[];
  noHagas?: string[];
  empujeAxial: EmpujeAxial;
  danos?: string[];
  llevaA?: string[];
  provieneDe?: string[];
}

export interface DanoEsperado {
  empuje: { titulo: string; resumen: string; danos: string[] } | null;
  consideraciones: string[];
  danos: Dano[];
}

/** Lo que la evaluación entrega y estos diccionarios necesitan leer. */
export interface ResultadoEvaluado {
  observaciones: string[];
  porcentajeBep?: number | null;
}

export const CONSIDERACIONES = evaluacionJs.CONSIDERACIONES as unknown as Record<
  string,
  Consideracion
>;
export const EVENTOS = eventosJs.EVENTOS as unknown as Record<string, Evento>;
export const DANOS = eventosJs.DANOS as unknown as Record<string, Dano>;

/** Consideraciones que se dispararon en una evaluación, ya ordenadas. */
export function consideracionesDe(resultado: ResultadoEvaluado): Consideracion[] {
  return evaluacionJs.contextoParaEvaluacion(normalizar(resultado)) as unknown as Consideracion[];
}

/** Empuje axial y daños esperables del punto evaluado. */
export function danosDe(resultado: ResultadoEvaluado): DanoEsperado {
  return evaluacionJs.danoEsperado(normalizar(resultado)) as unknown as DanoEsperado;
}

/** Frase que explica en qué régimen de empuje está el punto. `null` si no aplica. */
export function empujeDe(porcentajeBep: number | null | undefined): string | null {
  if (porcentajeBep === null || porcentajeBep === undefined) return null;
  return (evaluacionJs.explicarEmpuje(porcentajeBep) as string | null) ?? null;
}

/** Marco general de reglas, para cuando todavía no hay un punto evaluado. */
export function reglasParaPrompt(): string {
  return evaluacionJs.resumenParaPrompt({ incluirPendientes: false }) as string;
}

/**
 * Eventos que pueden estar causando los indicados, remontando el árbol de
 * sucesos. Aquí es donde aparecen las causas de circunstancia —escala, el
 * cabezal común, la booster, el cliente que no entrega— que no cuelgan
 * directamente de una consideración numérica.
 */
export function causasDe(ids: string[], profundidad = 2): string[] {
  const fuera = new Set<string>();
  for (const id of ids) {
    const cadena = eventosJs.cadenaDeCausas(id, { profundidad }) as Array<{ id: string }>;
    for (const c of cadena) fuera.add(c.id);
  }
  for (const id of ids) fuera.delete(id);
  return [...fuera];
}

/** Tabla de síntomas: qué combinación de lecturas apunta a qué evento. */
export function matrizDeSintomas(): string {
  const filas = eventosJs.MATRIZ_SINTOMAS as unknown as Array<{
    patron: Record<string, string>;
    evento: string;
    empuje: string;
    lectura: string;
  }>;
  const l = [
    "TABLA DE SÍNTOMAS — combinaciones de lecturas y a qué apuntan",
    "Sirve para saber qué preguntar cuando falta un dato para decidir.",
    "",
  ];
  for (const f of filas) {
    const patron = Object.entries(f.patron)
      .map(([k, v]) => `${k} ${v}`)
      .join(" + ");
    l.push(`- ${patron} → ${f.evento} (${f.empuje}). ${f.lectura}`);
  }
  return l.join("\n");
}

/** Texto de los eventos indicados. Sin ids, vuelca todos. */
export function eventosParaPrompt(ids?: string[]): string {
  const opciones = { ids: ids ?? null } as unknown as Parameters<
    typeof eventosJs.eventosParaPrompt
  >[0];
  return eventosJs.eventosParaPrompt(opciones) as string;
}

/** Texto del glosario para las claves indicadas. */
export function glosarioParaPrompt(claves?: string[]): string {
  const opciones = { soloClaves: claves ?? null } as unknown as Parameters<
    typeof glosarioJs.glosarioParaPrompt
  >[0];
  return glosarioJs.glosarioParaPrompt(opciones) as string;
}

/** El helper de JS espera `porcentajeBep` ausente, no en `null`. */
function normalizar(r: ResultadoEvaluado) {
  return r.porcentajeBep === null || r.porcentajeBep === undefined
    ? { observaciones: r.observaciones }
    : { observaciones: r.observaciones, porcentajeBep: r.porcentajeBep };
}
