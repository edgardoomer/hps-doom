/**
 * Configuración del asistente de análisis.
 *
 * El proveedor es DeepSeek, que expone una API compatible con la de OpenAI, así
 * que se consume con el SDK oficial `openai` apuntando su `baseURL` a DeepSeek.
 * Cambiar de proveedor (OpenAI, Groq, un modelo local con servidor compatible…)
 * es cuestión de tocar `DEEPSEEK_BASE_URL` y `DEEPSEEK_MODEL` en el `.env`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  DÓNDE PONER LA CLAVE API
 * ────────────────────────────────────────────────────────────────────────────
 *  En el archivo `.env` de esta carpeta (hay plantilla en `.env.example`):
 *
 *      DEEPSEEK_API_KEY=sk-...
 *
 *  `.env` está en .gitignore, así que no se sube al repositorio. La lee sólo el
 *  servidor: la consume `src/services/aiService.ts`, que es una server function
 *  de TanStack Start. Por eso la variable no lleva el prefijo `VITE_` — con él,
 *  Vite la incrustaría en el bundle del navegador.
 *
 *  Sin clave la aplicación sigue funcionando: el análisis inicial siempre se
 *  redacta en local, y las consultas del chat avisan de que falta la clave.
 * ────────────────────────────────────────────────────────────────────────────
 */

const env = (nombre: string): string => {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[nombre] ?? "";
};

export interface AiConfig {
  /** Clave del proveedor. Vacía = las consultas responden con el motor local. */
  apiKey: string;
  /** Raíz de la API compatible con OpenAI. */
  baseUrl: string;
  /** Modelo a usar. `deepseek-chat` es el de propósito general. */
  modelo: string;
  maxTokens: number;
  temperatura: number;
  /** Segundos antes de abandonar la llamada y caer al motor local. */
  timeoutSegundos: number;
  /** Reintentos del SDK ante errores de red o 429. */
  reintentos: number;
}

export const aiConfig: AiConfig = {
  apiKey: env("DEEPSEEK_API_KEY") || env("OPENAI_API_KEY"),
  baseUrl: env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com/v1",
  modelo: env("DEEPSEEK_MODEL") || "deepseek-chat",
  maxTokens: Number(env("DEEPSEEK_MAX_TOKENS")) || 1500,
  temperatura: 0.2,
  timeoutSegundos: 60,
  reintentos: 1,
};

/** `true` cuando hay clave configurada y se puede llamar al modelo. */
export function iaConfigurada(): boolean {
  return aiConfig.apiKey.trim().length > 0;
}
