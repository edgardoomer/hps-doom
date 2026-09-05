/**
 * Construcción del contexto que se le pasa al modelo.
 *
 * Toma los tres diccionarios de `src/lib/knowledge` y arma dos piezas:
 *  - el prompt de sistema (papel y forma de trabajar), y
 *  - el bloque de situación (bomba, punto de operación y veredicto actuales).
 *
 * Al conocimiento pertinente se suman las cadenas de causa: los eventos que
 * pueden estar provocando lo que se ve. Ahí viven las causas de proceso
 * —escala, cabezal común, booster, válvula aguas abajo, bypass abierto— que no
 * cuelgan de ninguna consideración numérica y que sin esto el modelo nunca
 * llegaría a proponer.
 */
import {
  causasDe,
  consideracionesDe,
  danosDe,
  empujeDe,
  eventosParaPrompt,
  glosarioParaPrompt,
  matrizDeSintomas,
  reglasParaPrompt,
} from "@/lib/knowledge";
import { int, num } from "@/lib/format";
import type { AnalysisRequest } from "@/types/chat";

/** Papel del asistente y cómo debe trabajar. */
export const PROMPT_SISTEMA = [
  "Eres el asistente técnico de HPS-DOOM, una aplicación de monitoreo de bombas horizontales de superficie en campo petrolero.",
  "Hablas con operadores e ingenieros de producción. Respondes en español, en tono directo y de campo, sin adornos.",
  "",
  "Tu trabajo no es recitar datos: es diagnosticar. El operador ya tiene los números en pantalla.",
  "",
  "Cómo trabajas:",
  "- Razona por hipótesis. Da las dos o tres causas más probables, ordenadas, y di qué distingue una de otra.",
  "- Si te falta un dato para decidir, pregúntalo. Una o dos preguntas concretas y discriminantes, no un cuestionario.",
  "- Mira más allá de la bomba. La causa suele estar en el proceso: una válvula aguas abajo mal cerrada, un check pegado, el bypass abierto o cerrado de más, escala en la línea, otras unidades del cabezal común empujando contra ella, la booster de succión, el cliente que dejó de entregar fluido, una fuga en la descarga. El contexto trae esos eventos y sus cadenas de causa: úsalos.",
  "- No repitas las cifras de la evaluación salvo que sean la clave del razonamiento.",
  "- Cierra diciendo cuál es tu hipótesis principal y qué haría falta para confirmarla.",
  "",
  "Límites:",
  "- Apóyate en el contexto que se te entrega. Si un dato no está, pregúntalo o dilo; no lo inventes.",
  "- Distingue lo medido de lo supuesto.",
  "- Si algo puede romper la bomba en horas, dilo primero y sin rodeos.",
  "- No recomiendes maniobras que pongan en riesgo al personal ni al equipo.",
  "- Sé breve: esto se lee en locación. Salvo que te pidan un listado, no pases de unas pocas frases.",
].join("\n");

/** Estructura que se le pide al modelo para el análisis inicial. */
const FORMATO_ANALISIS = [
  "Redacta el análisis con estas secciones, en este orden y con estos títulos exactos:",
  "",
  "ESTADO",
  "Una o dos frases: qué está pasando con la bomba ahora mismo.",
  "",
  "QUÉ REVISAR",
  "Lista de comprobaciones concretas, la más urgente primero.",
  "",
  "POSIBLES DAÑOS",
  "Qué se deteriora si la condición se sostiene, y en qué plazo.",
  "",
  "ACCIONES",
  "Qué hacer, en orden. Si no hay nada que corregir, dilo en una línea.",
].join("\n");

const FORMATO_ARRANQUE = [
  "Redacta el análisis de arranque con estas secciones, en este orden y con estos títulos exactos:",
  "",
  "LIMITACIONES",
  "Qué restringe el arranque con los datos de locación dados.",
  "",
  "RECOMENDACIONES",
  "Cómo arrancar la unidad, paso a paso.",
  "",
  "OTROS",
  "Comprobaciones mecánicas y de seguridad previas.",
].join("\n");

const dato = (etiqueta: string, valor: string | number | null | undefined, unidad = "") =>
  valor === null || valor === undefined
    ? null
    : `- ${etiqueta}: ${valor}${unidad ? " " + unidad : ""}`;

/** Bloque con la bomba, el punto de operación y el veredicto actuales. */
export function bloqueDeSituacion(req: AnalysisRequest): string {
  const l: string[] = [];
  const b = req.bomba;
  const o = req.operacion;
  const e = req.evaluacion;

  l.push("SITUACIÓN ACTUAL");
  l.push("");
  if (b) {
    l.push(
      `Unidad: ${b.nombre} — ${b.modeloBomba}, ${b.etapas} etapas, servicio de ${b.servicio}.`,
    );
    if (b.puntoDiseno) {
      const p = b.puntoDiseno;
      l.push(
        `Punto de diseño de ficha: ${num(p.caudal)} USbl/día, head ${num(p.headReal)} psi, ${int(p.rpm)} rpm, eficiencia ${num(p.eficiencia, 2)} %.`,
      );
    } else {
      l.push("Esta unidad no tiene punto de diseño documentado en su ficha.");
    }
    if (b.nota) l.push(`Salvedad de la ficha: ${b.nota}`);
  } else {
    l.push("No hay bomba seleccionada.");
  }

  l.push("");
  l.push("Lecturas de campo:");
  const lecturas = [
    dato("Presión de succión", o?.presionSuccion ?? null, "psi.g"),
    dato("Presión de descarga", o?.presionDescarga ?? null, "psi.g"),
    dato("Caudal", o?.caudal ?? null, "USbl/día"),
    dato("Frecuencia", o?.frecuencia ?? null, "Hz"),
  ].filter(Boolean) as string[];
  l.push(lecturas.length ? lecturas.join("\n") : "- Sin lecturas introducidas.");

  if (req.locacion) {
    const loc = [
      dato("Presión de succión de locación", req.locacion.presionSuccion, "psi.g"),
      dato("Presión a romper", req.locacion.presionARomper, "psi.g"),
      dato("Caudal esperado", req.locacion.caudalEsperado, "USbl/día"),
    ].filter(Boolean) as string[];
    if (loc.length) {
      l.push("");
      l.push("Datos de locación:");
      l.push(loc.join("\n"));
    }
  }

  if (e && e.estado !== "sin-datos") {
    l.push("");
    l.push(`Veredicto de la aplicación: ${e.etiqueta}.`);
    const m = [
      dato("Head medido", e.headCalculado, "psi"),
      dato("Head que predice la curva", e.headCurva, "psi"),
      dato("Desviación", e.desviacion, "%"),
      dato("Eficiencia estimada", e.eficiencia, "%"),
      dato("Potencia al eje estimada", e.potencia, "hp"),
      dato("Caudal respecto al BEP", e.porcentajeBep, "%"),
      dato("MCSF a esa frecuencia", e.mcsf, "USbl/día"),
      dato("Caudal máximo de la curva", e.qMax, "USbl/día"),
      dato("Frecuencia equivalente al punto medido", e.frecuenciaEquivalente, "Hz"),
    ].filter(Boolean) as string[];
    l.push(m.join("\n"));

    if (e.observaciones.length) {
      l.push("");
      l.push("Observaciones que disparó la evaluación:");
      for (const obs of e.observaciones) l.push(`- ${obs}`);
    }

    const empuje = empujeDe(e.porcentajeBep);
    if (empuje) {
      l.push("");
      l.push(`Empuje axial deducido: ${empuje}`);
    }
  } else {
    l.push("");
    l.push("Todavía no se ha evaluado el punto de operación.");
  }

  l.push("");
  l.push(
    "Eso es TODO lo que la aplicación mide. Cualquier otra lectura —amperaje, vibración, temperatura de la cámara de empuje, posición de válvulas, estado del bypass, qué hacen las otras bombas del cabezal— no la tienes: si la necesitas para decidir, pregúntasela al operador.",
  );

  return l.join("\n");
}

/** Conocimiento pertinente: lo que se disparó, más lo que puede estar causándolo. */
export function bloqueDeConocimiento(req: AnalysisRequest): string {
  const l: string[] = [];
  const e = req.evaluacion;

  if (!e || e.estado === "sin-datos") {
    l.push(reglasParaPrompt());
    l.push("");
    l.push(matrizDeSintomas());
    return l.join("\n").trim();
  }

  const consideraciones = consideracionesDe(e);
  const eventosIds = [...new Set(consideraciones.flatMap((c) => c.eventos ?? []))];
  const terminos = [...new Set(consideraciones.flatMap((c) => c.glosario ?? []))];
  const dano = danosDe(e);

  if (terminos.length) {
    l.push(glosarioParaPrompt(terminos));
    l.push("");
  }

  l.push("CONSIDERACIONES QUE APLICAN A ESTE PUNTO");
  l.push("");
  for (const c of consideraciones) {
    l.push(`### ${c.titulo} [${c.estado}]`);
    l.push(`Se dispara si ${c.condicion}.`);
    l.push(`Significado: ${c.significado}`);
    if (c.causas?.length) l.push(`Causas probables: ${c.causas.join("; ")}.`);
    if (c.acciones?.length) l.push(`Acciones: ${c.acciones.join("; ")}.`);
    if (c.empujeAxial) {
      l.push(
        `Empuje axial: ${c.empujeAxial.tipo} (${c.empujeAxial.severidad}). ${c.empujeAxial.porQue}`,
      );
    }
    l.push(`Riesgo: ${c.riesgo}`);
    l.push("");
  }

  if (dano.danos.length) {
    l.push("DAÑOS ESPERABLES SI NO SE CORRIGE");
    l.push("");
    for (const d of dano.danos) {
      l.push(`### ${d.id} — ${d.titulo} [${d.gravedad}]`);
      l.push(`Mecanismo: ${d.queLePasaALaBomba}`);
      l.push(`Se detecta por: ${d.comoSeDetecta}`);
      l.push(`Ventana de tiempo: ${d.ventanaDeTiempo}`);
      l.push("");
    }
  }

  if (eventosIds.length) {
    // A los eventos directos se suman los que pueden estar causándolos: ahí es
    // donde aparecen la válvula aguas abajo, el bypass, la escala, el cabezal
    // común y la booster.
    const causas = causasDe(eventosIds, 2);
    l.push(eventosParaPrompt([...eventosIds, ...causas]));
    if (causas.length) {
      l.push("");
      l.push(
        `HIPÓTESIS A CONSIDERAR: los eventos ${causas.join(", ")} no los ha detectado la evaluación —no tiene cómo, son de proceso y no de curva—, pero pueden ser la causa de los anteriores. Valóralos y pregunta por sus síntomas si encajan con lo que te cuenta el operador.`,
      );
    }
  }

  l.push("");
  l.push(matrizDeSintomas());

  return l.join("\n").trim();
}

/** Mensaje completo para el análisis inicial que dispara "INICIAR ANÁLISIS". */
export function promptAnalisisInicial(req: AnalysisRequest): string {
  const formato = req.contexto === "arranques" ? FORMATO_ARRANQUE : FORMATO_ANALISIS;
  return [bloqueDeSituacion(req), "", bloqueDeConocimiento(req), "", formato].join("\n");
}

/** Mensaje para una consulta libre del operador en el chat. */
export function promptConsulta(req: AnalysisRequest, consulta: string): string {
  return [
    bloqueDeSituacion(req),
    "",
    bloqueDeConocimiento(req),
    "",
    "CONSULTA DEL OPERADOR",
    consulta,
    "",
    "Responde diagnosticando, no resumiendo. Si con lo que hay no se puede decidir entre dos causas, di cuáles son y pregunta lo que las distingue. Sin secciones ni títulos, salvo que la pregunta pida un listado.",
  ].join("\n");
}
