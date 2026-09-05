import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePumps } from "./PumpContext";
import { useSession } from "./SessionContext";
import { runInitialAnalysis, sendMessage } from "@/services/chatService";
import { generateStartupSummary } from "@/services/operationService";
import type { RespuestaIa } from "@/services/aiService";
import type { AnalysisRequest, ChatContext, ChatMessage } from "@/types/chat";

interface ChatRunnerValue {
  typing: boolean;
  streaming: string | null;
  activeContext: ChatContext;
  setActiveContext: (c: ChatContext) => void;
  send: (text: string) => void;
  startAnalysis: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const Ctx = createContext<ChatRunnerValue | null>(null);

function makeMessage(role: ChatMessage["role"], contenido: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    contenido,
    timestamp: Date.now(),
  };
}

/** El aviso de origen se añade al final para que el operador sepa qué está leyendo. */
function componer(r: RespuestaIa): string {
  return r.aviso
    ? `${r.texto}

— ${r.aviso}`
    : r.texto;
}

export function ChatRunnerProvider({ children }: { children: ReactNode }) {
  const { selectedPump } = usePumps();
  const session = useSession();
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [activeContext, setActiveContext] = useState<ChatContext>("curvas");
  const [collapsed, setCollapsed] = useState(false);
  const busy = useRef(false);

  const buildRequest = useCallback(
    (contexto: ChatContext): AnalysisRequest => ({
      contexto,
      bomba: selectedPump,
      operacion: session.operation,
      evaluacion: session.evaluation,
      locacion: session.location,
      historial: session.threads[contexto],
    }),
    [selectedPump, session.operation, session.evaluation, session.location, session.threads],
  );

  const stream = useCallback(
    async (contexto: ChatContext, texto: string) => {
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        session.appendMessage(contexto, makeMessage("assistant", texto));
        return;
      }
      const chunks = texto.split(" ");
      let acc = "";
      for (const chunk of chunks) {
        acc = acc ? `${acc} ${chunk}` : chunk;
        setStreaming(acc);
        await new Promise((r) => setTimeout(r, 18));
      }
      setStreaming(null);
      session.appendMessage(contexto, makeMessage("assistant", texto));
    },
    [session],
  );

  const send = useCallback(
    (text: string) => {
      if (busy.current || !text.trim()) return;
      const contexto = activeContext;
      busy.current = true;
      session.appendMessage(contexto, makeMessage("user", text.trim()));
      setTyping(true);
      sendMessage(buildRequest(contexto), text.trim())
        .then((r: RespuestaIa) => stream(contexto, componer(r)))
        .finally(() => {
          setTyping(false);
          busy.current = false;
        });
    },
    [activeContext, buildRequest, session, stream],
  );

  const startAnalysis = useCallback(() => {
    if (busy.current) return;
    const contexto = activeContext;
    if (contexto === "general") return;
    busy.current = true;
    setTyping(true);

    const summaryTask =
      contexto === "arranques" && selectedPump
        ? generateStartupSummary(selectedPump.id, session.location).then((s) =>
            session.setStartupSummary(s),
          )
        : Promise.resolve();

    Promise.all([summaryTask, runInitialAnalysis(buildRequest(contexto))])
      .then(([, r]) => stream(contexto, componer(r)))
      .finally(() => {
        setTyping(false);
        busy.current = false;
      });
  }, [activeContext, buildRequest, selectedPump, session, stream]);

  const value = useMemo<ChatRunnerValue>(
    () => ({
      typing,
      streaming,
      activeContext,
      setActiveContext,
      send,
      startAnalysis,
      collapsed,
      setCollapsed,
    }),
    [typing, streaming, activeContext, send, startAnalysis, collapsed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat(): ChatRunnerValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChat debe usarse dentro de ChatRunnerProvider");
  return ctx;
}
