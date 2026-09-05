/**
 * Servicio del chat. Delega en la server function `analizarEnServidor`, que es
 * quien tiene acceso a la clave API. Aquí no hay secretos.
 */
import { analizarEnServidor, type RespuestaIa } from "@/services/aiService";
import type { AnalysisRequest } from "@/types/chat";

/** Respuesta a una consulta libre escrita por el operador. */
export async function sendMessage(ctx: AnalysisRequest, text: string): Promise<RespuestaIa> {
  return analizarEnServidor({ data: { tipo: "consulta", peticion: ctx, consulta: text } });
}

/** Análisis que dispara el botón INICIAR ANÁLISIS del chat. */
export async function runInitialAnalysis(ctx: AnalysisRequest): Promise<RespuestaIa> {
  return analizarEnServidor({ data: { tipo: "analisis", peticion: ctx } });
}
