import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChatContext, ChatMessage } from "@/types/chat";
import type { LocationInput, OperatingEvaluation, OperatingInput, StartupSummary } from "@/types/operation";

const EMPTY_OPERATION: OperatingInput = {
  presionSuccion: null,
  presionDescarga: null,
  caudal: null,
  frecuencia: null,
};

const EMPTY_LOCATION: LocationInput = {
  presionSuccion: null,
  presionARomper: null,
  caudalEsperado: null,
};

interface SessionContextValue {
  operation: OperatingInput;
  setOperation: (input: OperatingInput) => void;
  evaluation: OperatingEvaluation | null;
  setEvaluation: (evaluation: OperatingEvaluation | null) => void;
  location: LocationInput;
  setLocation: (input: LocationInput) => void;
  startupSummary: StartupSummary | null;
  setStartupSummary: (summary: StartupSummary | null) => void;
  threads: Record<ChatContext, ChatMessage[]>;
  appendMessage: (contexto: ChatContext, message: ChatMessage) => void;
  clearThread: (contexto: ChatContext) => void;
  resetOperation: () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

// El historial vive solo en memoria: se pierde al recargar. No se persiste en ningún almacenamiento.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [operation, setOperation] = useState<OperatingInput>(EMPTY_OPERATION);
  const [evaluation, setEvaluation] = useState<OperatingEvaluation | null>(null);
  const [location, setLocation] = useState<LocationInput>(EMPTY_LOCATION);
  const [startupSummary, setStartupSummary] = useState<StartupSummary | null>(null);
  const [threads, setThreads] = useState<Record<ChatContext, ChatMessage[]>>({
    curvas: [],
    arranques: [],
    general: [],
  });

  const appendMessage = useCallback((contexto: ChatContext, message: ChatMessage) => {
    setThreads((prev) => ({ ...prev, [contexto]: [...prev[contexto], message] }));
  }, []);

  const clearThread = useCallback((contexto: ChatContext) => {
    setThreads((prev) => ({ ...prev, [contexto]: [] }));
  }, []);

  const resetOperation = useCallback(() => {
    setOperation(EMPTY_OPERATION);
    setEvaluation(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      operation,
      setOperation,
      evaluation,
      setEvaluation,
      location,
      setLocation,
      startupSummary,
      setStartupSummary,
      threads,
      appendMessage,
      clearThread,
      resetOperation,
    }),
    [operation, evaluation, location, startupSummary, threads, appendMessage, clearThread, resetOperation],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}