/**
 * Puente con el modelo de lenguaje (DeepSeek, vía el SDK de OpenAI).
 *
 * Reparto de trabajo:
 *  - ANÁLISIS INICIAL (botón INICIAR ANÁLISIS): siempre local. Se redacta con
 *    los diccionarios de `src/lib/knowledge`, es determinista, instantáneo y no
 *    consume tokens.
 *  - CONSULTA del operador (cuadro de texto): va al modelo, con el contexto
 *    pertinente ya montado. Si no hay clave o la llamada falla, responde el
 *    motor local avisando de ello.
 *
 * Es una server function de TanStack Start: se ejecuta en el servidor, así que
 * la clave nunca llega al navegador.
 */
import tls from "node:tls";
import { createServerFn } from "@tanstack/react-start";
import OpenAI from "openai";
import { aiConfig, iaConfigurada } from "@/lib/ai/config";
import { analisisLocal, respuestaLocal } from "@/lib/ai/local";
import { promptConsulta, PROMPT_SISTEMA } from "@/lib/ai/prompt";
import type { AnalysisRequest } from "@/types/chat";

export interface PeticionIa {
  /** "analisis" lo dispara INICIAR ANÁLISIS; "consulta", el cuadro de texto. */
  tipo: "analisis" | "consulta";
  peticion: AnalysisRequest;
  consulta?: string;
}

export interface RespuestaIa {
  texto: string;
  /** De dónde salió la respuesta, para poder avisar en la interfaz. */
  origen: "modelo" | "local";
  /** Modelo que respondió, si fue el modelo. */
  modelo?: string;
  /** Motivo de haber caído al motor local, si aplica. */
  aviso?: string;
}

/** El SDK envuelve los fallos de red en "Connection error."; el motivo real va en `cause`. */
function detalleDelError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const causa = (error as { cause?: unknown }).cause;
  if (causa instanceof Error) {
    const codigo = (causa as { code?: string }).code;
    return `${error.message} → ${codigo ? codigo + ": " : ""}${causa.message}`;
  }
  return error.message;
}

/**
 * Confía también en las autoridades certificadoras del sistema operativo.
 *
 * Node trae su propia lista de CAs y no mira la del sistema salvo que se le
 * pase --use-system-ca. En equipos con antivirus que inspecciona HTTPS (Avast,
 * Kaspersky…) o detrás de un proxy corporativo, el certificado que llega está
 * firmado por una raíz que sólo existe en el almacén del sistema, y toda
 * llamada HTTPS falla con "unable to verify the first certificate".
 *
 * Fusionar ambas listas resuelve ese caso sin desactivar la verificación TLS:
 * se siguen validando los certificados, sólo que contra más raíces de confianza.
 */
let caPreparadas = false;
function confiarEnCasDelSistema(): void {
  if (caPreparadas) return;
  caPreparadas = true;
  try {
    if (typeof tls.setDefaultCACertificates !== "function") return;
    const actuales = tls.getCACertificates("default");
    const delSistema = tls.getCACertificates("system");
    if (delSistema.length) tls.setDefaultCACertificates([...actuales, ...delSistema]);
  } catch (error) {
    // Node antiguo o plataforma sin almacén accesible: se sigue con las de Node.
    console.warn("[aiService] no se pudieron cargar las CAs del sistema:", error);
  }
}

let cliente: OpenAI | null = null;

/** Cliente perezoso: no se construye hasta que hace falta y hay clave. */
function getCliente(): OpenAI {
  confiarEnCasDelSistema();
  cliente ??= new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseUrl,
    timeout: aiConfig.timeoutSegundos * 1000,
    maxRetries: aiConfig.reintentos,
  });
  return cliente;
}

async function preguntarAlModelo(prompt: string): Promise<string> {
  const res = await getCliente().chat.completions.create({
    model: aiConfig.modelo,
    max_tokens: aiConfig.maxTokens,
    temperature: aiConfig.temperatura,
    messages: [
      { role: "system", content: PROMPT_SISTEMA },
      { role: "user", content: prompt },
    ],
  });
  const texto = res.choices[0]?.message?.content?.trim() ?? "";
  if (!texto) throw new Error("El modelo devolvió una respuesta vacía.");
  return texto;
}

export const analizarEnServidor = createServerFn({ method: "POST" })
  .validator((d: PeticionIa) => d)
  .handler(async ({ data }): Promise<RespuestaIa> => {
    const { tipo, peticion, consulta } = data;

    // El análisis inicial no pasa por el modelo: sale de los diccionarios.
    if (tipo === "analisis") {
      return { texto: analisisLocal(peticion), origen: "local" };
    }

    const pregunta = consulta ?? "";

    if (!iaConfigurada()) {
      return {
        texto: respuestaLocal(peticion, pregunta),
        origen: "local",
        aviso:
          "No hay clave API configurada: añade DEEPSEEK_API_KEY al archivo .env para que el modelo responda.",
      };
    }

    try {
      const texto = await preguntarAlModelo(promptConsulta(peticion, pregunta));
      return { texto, origen: "modelo", modelo: aiConfig.modelo };
    } catch (error) {
      const motivo = detalleDelError(error);
      console.error("[aiService] fallo al llamar al modelo:", motivo, error);
      return {
        texto: respuestaLocal(peticion, pregunta),
        origen: "local",
        aviso: `No se pudo contactar con el modelo (${motivo}).`,
      };
    }
  });
