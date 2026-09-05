/**
 * HPS-DOOM — Punto de entrada de los diccionarios de contexto.
 *
 * Tres diccionarios, cada uno con un trabajo distinto:
 *
 *   glosario.js    Vocabulario. Qué significa cada término que aparece en los
 *                  otros dos. Es lo primero que el modelo necesita leer.
 *   evaluacion.js  Reglas de la pestaña "Curvas de eficiencia": cómo se decide
 *                  si un punto está dentro, en el límite o fuera de curva, y
 *                  qué empuje y qué daño implica cada caso.
 *   eventos.js     Lo que el operador ve en locación, con su árbol causa-efecto
 *                  y el catálogo de daños al que apuntan todos los demás.
 *
 * Los tres se cruzan por ID: una consideración lista `eventos` y `glosario`,
 * un evento lista `danos` y `glosario`, y un término lista `eventos`.
 *
 * Para inyectar contexto a un modelo:
 *   import { contextoCompletoParaPrompt } from "./index.js";
 *   const sistema = contextoCompletoParaPrompt();
 *
 * Para inyectar sólo lo pertinente a una evaluación concreta:
 *   import { contextoDeUnaEvaluacion } from "./index.js";
 *   const sistema = contextoDeUnaEvaluacion(resultado);
 */

export * from "./glosario.js";
export * from "./evaluacion.js";
export * from "./eventos.js";
export { construirGrafo, dibujarArbol, inyectarEstilos, CSS_ARBOL } from "./arbolEventos.js";

import { GLOSARIO, glosarioParaPrompt, terminosDe } from "./glosario.js";
import {
  CONSIDERACIONES,
  contextoParaEvaluacion,
  danoEsperado,
  empujeAxialDelPunto,
  resumenParaPrompt,
} from "./evaluacion.js";
import { DANOS, EVENTOS, eventosParaPrompt, verificarIntegridad } from "./eventos.js";

/**
 * Todo el contexto, en texto plano, para un prompt de sistema.
 * Son unas 900 líneas: úsalo cuando el modelo tenga que razonar libremente.
 */
export function contextoCompletoParaPrompt() {
  return [
    glosarioParaPrompt(),
    "",
    resumenParaPrompt(),
    "",
    eventosParaPrompt(),
  ].join("\n");
}

/**
 * Sólo lo que hace falta para explicar UNA evaluación: las consideraciones que
 * se dispararon, los términos que usan, los eventos de campo asociados y los
 * daños esperados. Es lo que conviene inyectar en producción.
 *
 * @param {{observaciones: string[], porcentajeBep?: number}} resultado
 */
export function contextoDeUnaEvaluacion(resultado) {
  const consideraciones = contextoParaEvaluacion(resultado);
  const clavesGlosario = [
    ...new Set(consideraciones.flatMap((c) => c.glosario ?? [])),
  ];
  const idsEventos = [...new Set(consideraciones.flatMap((c) => c.eventos ?? []))];
  const dano = danoEsperado(resultado);

  const l = [];
  l.push(glosarioParaPrompt({ soloClaves: clavesGlosario }));
  l.push("");
  l.push("CONSIDERACIONES QUE SE DISPARARON (en orden de atención)");
  for (const c of consideraciones) {
    l.push("");
    l.push(`### ${c.titulo} [${c.estado}]`);
    l.push(c.significado);
    l.push(`Causas: ${c.causas.join("; ")}.`);
    l.push(`Acciones: ${c.acciones.join("; ")}.`);
    l.push(
      `Empuje axial: ${c.empujeAxial.tipo} (${c.empujeAxial.severidad}). ${c.empujeAxial.porQue}`
    );
    l.push(`Riesgo: ${c.riesgo}`);
  }
  if (dano.empuje) {
    l.push("");
    l.push(`RÉGIMEN DE EMPUJE: ${dano.empuje.titulo}. ${dano.empuje.resumen}`);
  }
  if (dano.danos.length) {
    l.push("");
    l.push("DAÑOS ESPERADOS SI NO SE CORRIGE");
    for (const d of dano.danos) {
      l.push(`- ${d.titulo} (${d.gravedad}). ${d.queLePasaALaBomba} Ventana: ${d.ventanaDeTiempo}`);
    }
  }
  if (idsEventos.length) {
    l.push("");
    l.push(eventosParaPrompt({ ids: idsEventos }));
  }
  return l.join("\n");
}

/**
 * Comprueba que los tres diccionarios se refieren entre sí sin cabos sueltos.
 * Devuelve la lista de problemas; vacía significa que todo cuadra.
 */
export function verificarTodo() {
  const problemas = verificarIntegridad();

  for (const [id, c] of Object.entries(CONSIDERACIONES)) {
    if (id !== c.id) problemas.push(`consideración ${id}: la clave no coincide con su id`);
    for (const d of c.danos ?? [])
      if (!DANOS[d]) problemas.push(`consideración ${id}: daño inexistente ${d}`);
    for (const e of c.eventos ?? [])
      if (!EVENTOS[e]) problemas.push(`consideración ${id}: evento inexistente ${e}`);
    for (const g of c.glosario ?? [])
      if (!GLOSARIO[g]) problemas.push(`consideración ${id}: término inexistente ${g}`);
    if (!c.empujeAxial) problemas.push(`consideración ${id}: le falta empujeAxial`);
  }

  for (const [id, ev] of Object.entries(EVENTOS)) {
    for (const g of ev.glosario ?? [])
      if (!GLOSARIO[g]) problemas.push(`evento ${id}: término inexistente ${g}`);
  }

  for (const [clave, t] of Object.entries(GLOSARIO)) {
    for (const e of t.eventos ?? [])
      if (!EVENTOS[e]) problemas.push(`término ${clave}: evento inexistente ${e}`);
    for (const r of t.relacionados ?? [])
      if (!GLOSARIO[r]) problemas.push(`término ${clave}: relacionado inexistente ${r}`);
  }

  return problemas;
}

export default {
  glosario: GLOSARIO,
  consideraciones: CONSIDERACIONES,
  eventos: EVENTOS,
  danos: DANOS,
  empujeAxialDelPunto,
  terminosDe,
  contextoCompletoParaPrompt,
  contextoDeUnaEvaluacion,
  verificarTodo,
};
