/**
 * Motor local de análisis.
 *
 * Redacta el análisis a partir de los diccionarios de `src/lib/knowledge` sin
 * llamar a ningún modelo. Es lo que responde el chat mientras no haya clave API
 * configurada, y también el plan B si la llamada al modelo falla.
 *
 * No inventa nada: todo lo que escribe sale de las consideraciones que disparó
 * la evaluación y de los daños y eventos asociados a ellas.
 */
import { consideracionesDe, danosDe, empujeDe, EVENTOS } from "@/lib/knowledge";
import { int, num } from "@/lib/format";
import type { AnalysisRequest } from "@/types/chat";

const unicos = (xs: string[]) => [...new Set(xs)];

/** Análisis del punto de operación, con las mismas secciones que pide el modelo. */
export function analisisLocalCurvas(req: AnalysisRequest): string {
  const e = req.evaluacion;
  const b = req.bomba;

  if (!e || e.estado === "sin-datos") {
    return [
      "ESTADO",
      "Todavía no hay un punto de operación evaluado. Introduce presión de succión, presión de descarga, caudal y frecuencia, pulsa EVALUAR y vuelve a lanzar el análisis.",
    ].join("\n");
  }

  const consideraciones = consideracionesDe(e);
  const dano = danosDe(e);
  const l: string[] = [];

  // --- ESTADO ---------------------------------------------------------------
  l.push("ESTADO");
  const unidad = b ? `${b.nombre} (${b.modeloBomba}, ${b.etapas} etapas)` : "La unidad";
  const cifras = [
    e.headCalculado !== null ? `head medido ${num(e.headCalculado)} psi` : null,
    e.headCurva !== null ? `curva ${num(e.headCurva)} psi` : null,
    e.desviacion !== null
      ? `desviación ${e.desviacion > 0 ? "+" : ""}${num(e.desviacion)} %`
      : null,
    e.porcentajeBep !== null ? `${num(e.porcentajeBep, 0)} % del BEP` : null,
  ].filter(Boolean);
  l.push(`${unidad}: ${e.etiqueta}. ${cifras.join(", ")}.`);
  const empuje = empujeDe(e.porcentajeBep);
  if (empuje) l.push(empuje);

  // --- QUÉ REVISAR ----------------------------------------------------------
  const verificaciones = unicos([
    ...consideraciones.flatMap((c) => c.causas ?? []),
    ...consideraciones
      .flatMap((c) => c.eventos ?? [])
      .flatMap((id) => EVENTOS[id]?.verificar ?? []),
  ]);
  if (verificaciones.length) {
    l.push("");
    l.push("QUÉ REVISAR");
    for (const v of verificaciones.slice(0, 8)) l.push(`- ${v}`);
  }

  // --- POSIBLES DAÑOS -------------------------------------------------------
  if (dano.danos.length) {
    l.push("");
    l.push("POSIBLES DAÑOS");
    for (const d of dano.danos.slice(0, 4)) {
      l.push(`- ${d.titulo} (${d.gravedad}). ${d.queLePasaALaBomba} Ventana: ${d.ventanaDeTiempo}`);
    }
  }

  // --- ACCIONES -------------------------------------------------------------
  const acciones = unicos(consideraciones.flatMap((c) => c.acciones ?? []));
  l.push("");
  l.push("ACCIONES");
  if (acciones.length) {
    for (const a of acciones.slice(0, 8)) l.push(`- ${a}`);
  } else {
    l.push("- Nada que corregir: registra el punto como referencia de tendencia.");
  }

  const noHagas = unicos(
    consideraciones.flatMap((c) => c.eventos ?? []).flatMap((id) => EVENTOS[id]?.noHagas ?? []),
  );
  if (noHagas.length) {
    l.push("");
    l.push("NO HAGAS");
    for (const n of noHagas.slice(0, 4)) l.push(`- ${n}`);
  }

  return l.join("\n");
}

/** Análisis de arranque a partir del resumen ya calculado por el servicio. */
export function analisisLocalArranques(req: AnalysisRequest): string {
  const b = req.bomba;
  const loc = req.locacion;
  const l: string[] = [];

  l.push("LIMITACIONES");
  if (!loc || loc.presionARomper === null) {
    l.push(
      "Faltan datos de locación: introduce presión de succión, presión a romper y caudal esperado.",
    );
  } else {
    l.push(
      `Hay que vencer ${num(loc.presionARomper)} psi en el cabezal con ${num(loc.presionSuccion ?? 0)} psi.g de succión.`,
    );
    if (b?.puntoDiseno) {
      l.push(
        `La unidad está dimensionada para ${num(b.puntoDiseno.caudal)} USbl/día a ${int(b.puntoDiseno.rpm)} rpm.`,
      );
    }
  }

  l.push("");
  l.push("RECOMENDACIONES");
  l.push("- Arrancar a frecuencia reducida y estabilizar la succión antes de subir carga.");
  l.push("- Subir en rampa vigilando amperaje del motor y presión de descarga.");
  l.push("- No sostener la unidad por debajo del MCSF durante el arranque.");

  l.push("");
  l.push("OTROS");
  l.push("- Verificar alineación, lubricación y sello mecánico antes de energizar.");
  l.push("- Comprobar el seteo de la válvula VRP y que la línea de descarga esté alineada.");
  l.push("- Confirmar nivel y disponibilidad de fluido en succión.");

  return l.join("\n");
}

/**
 * Respuesta local a una consulta libre del operador.
 *
 * Es un plan B: sin modelo no se puede razonar sobre la pregunta concreta, así
 * que responde en dos líneas y no repite el análisis. Volcar aquí todas las
 * consideraciones sólo entierra al operador en texto que ya tiene arriba.
 */
export function respuestaLocal(req: AnalysisRequest, _consulta: string): string {
  const e = req.evaluacion;
  const unidad = req.bomba?.nombre ?? "la unidad";
  if (!e || e.estado === "sin-datos") {
    return `No puedo responder a esa pregunta ahora mismo. Evalúa un punto de operación de ${unidad} y pulsa INICIAR ANÁLISIS para el diagnóstico.`;
  }
  return `No puedo responder a esa pregunta ahora mismo. ${unidad} está ${e.etiqueta.toLowerCase()}; el detalle lo tienes en el análisis, con INICIAR ANÁLISIS.`;
}

export function analisisLocal(req: AnalysisRequest): string {
  return req.contexto === "arranques" ? analisisLocalArranques(req) : analisisLocalCurvas(req);
}
