import type { LocationInput, OperatingEvaluation, OperatingInput } from "./operation";
import type { Pump } from "./pump";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  contenido: string;
  timestamp: number;
}

export type ChatContext = "curvas" | "arranques" | "general";

export interface AnalysisRequest {
  contexto: ChatContext;
  bomba: Pump | null;
  operacion: OperatingInput | null;
  evaluacion: OperatingEvaluation | null;
  locacion: LocationInput | null;
  historial: ChatMessage[];
}