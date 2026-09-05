/**
 * Compatibilidad.
 *
 * El diccionario original se dividió en tres archivos (glosario.js,
 * evaluacion.js y eventos.js). Este módulo mantiene vivos los imports que ya
 * existían en la app, para que nada se rompa mientras migras:
 *
 *   import { contextoParaEvaluacion, resumenParaPrompt } from "./diccionarioevaluacion.js";
 *   import diccionarioEvaluacion from "./diccionarioevaluacion.js";
 *
 * Ambas formas siguen funcionando. GLOSARIO se sigue exportando desde aquí,
 * aunque ahora vive en glosario.js y trae bastantes más términos.
 *
 * En código nuevo importa desde "./index.js" o desde el archivo concreto.
 */

export {
  UMBRALES,
  UMBRALES_PROPUESTOS,
  MAGNITUDES,
  CONSIDERACIONES,
  REGLA_DE_VEREDICTO,
  REGIMENES_EMPUJE,
  PRIORIDAD,
  LISTA_PENDIENTES,
  empujeAxialDelPunto,
  explicarEmpuje,
  contextoParaEvaluacion,
  danoEsperado,
  resumenParaPrompt,
  diccionarioEvaluacion,
  default,
} from "./evaluacion.js";

export { GLOSARIO, SECCIONES_GLOSARIO, termino, terminosDe, glosarioParaPrompt } from "./glosario.js";

export { EVENTOS, DANOS, FAMILIAS, MATRIZ_SINTOMAS, buscarPorSintomas, eventosParaPrompt } from "./eventos.js";
