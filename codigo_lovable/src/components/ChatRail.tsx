import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Trash2 } from "lucide-react";
import { useChat } from "@/context/ChatRunnerContext";
import { usePumps } from "@/context/PumpContext";
import { useSession } from "@/context/SessionContext";

const CONTEXT_LABEL = { curvas: "CURVAS", arranques: "ARRANQUES", general: "GENERAL" } as const;

function AssistantText({ contenido }: { contenido: string }) {
  return (
    <div className="space-y-1 text-[13px] leading-relaxed text-foreground">
      {contenido.split("\n").map((linea, i) => {
        const esEncabezado = linea.trim().length > 0 && linea === linea.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(linea);
        if (linea.trim() === "") return <div key={i} className="h-1" />;
        return esEncabezado ? (
          <p key={i} className="panel-title pt-1">
            {linea}
          </p>
        ) : (
          <p key={i}>{linea}</p>
        );
      })}
    </div>
  );
}

export function ChatRail() {
  const { activeContext, typing, streaming, send, startAnalysis, collapsed, setCollapsed } = useChat();
  const { selectedPump } = usePumps();
  const { threads, clearThread, evaluation, location } = useSession();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mensajes = threads[activeContext];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensajes, streaming, typing, activeContext]);

  if (collapsed) {
    return (
      <aside className="flex w-[44px] shrink-0 flex-col items-center gap-3 border-l border-border bg-card py-3 transition-all duration-200">
        <button
          type="button"
          aria-label="Expandir chat IA"
          onClick={() => setCollapsed(false)}
          className="rounded-[6px] p-1 text-ink-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft size={16} />
        </button>
        <MessageSquare size={16} className="text-muted-foreground" aria-hidden />
        <span className="panel-title [writing-mode:vertical-rl]">CHAT IA</span>
      </aside>
    );
  }

  const locacionCompleta =
    location.presionSuccion !== null && location.presionARomper !== null && location.caudalEsperado !== null;

  const accion =
    activeContext === "curvas"
      ? {
          label: "INICIAR ANÁLISIS",
          enabled: !!evaluation && evaluation.estado !== "sin-datos",
          hint: "Ingresa los datos de operación para habilitar el análisis.",
        }
      : activeContext === "arranques"
        ? {
            label: "GENERAR ANÁLISIS DE ARRANQUE",
            enabled: locacionCompleta && !!selectedPump,
            hint: "Ingresa los datos de locación para habilitar el análisis.",
          }
        : null;

  return (
    <aside className="flex w-[380px] min-w-[320px] shrink-0 flex-col border-l border-border bg-card transition-all duration-200">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="panel-title">CHAT IA</span>
        <span className="num rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] text-ink-secondary">
          {CONTEXT_LABEL[activeContext]}
        </span>
        <span className="num rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] text-ink-secondary">
          {selectedPump?.nombre ?? "—"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Nueva conversación"
            onClick={() => clearThread(activeContext)}
            className="rounded-[6px] p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            aria-label="Colapsar chat IA"
            onClick={() => setCollapsed(true)}
            className="rounded-[6px] p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </header>

      {accion && (
        <div className="border-b border-border px-3 py-2">
          <button
            type="button"
            disabled={!accion.enabled || typing}
            onClick={startAnalysis}
            className="w-full rounded-[6px] bg-primary px-3 py-1.5 text-[11px] font-medium tracking-[0.06em] text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {accion.label}
          </button>
          {!accion.enabled && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">{accion.hint}</p>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {mensajes.length === 0 && !streaming && !typing && (
          <p className="text-[12px] text-muted-foreground">Sin mensajes en este contexto.</p>
        )}
        {mensajes.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-[8px] bg-secondary px-2.5 py-1.5 text-[13px] text-foreground">
                {m.contenido}
              </p>
            </div>
          ) : (
            <AssistantText key={m.id} contenido={m.contenido} />
          ),
        )}
        {streaming && <AssistantText contenido={streaming} />}
        {typing && !streaming && (
          <div className="flex gap-1" aria-label="El asistente está escribiendo">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border px-3 py-2">
        <textarea
          rows={1}
          value={text}
          placeholder="Escribe tu consulta…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
              setText("");
            }
          }}
          className="max-h-[72px] min-h-[32px] flex-1 resize-none rounded-[6px] border border-input bg-background px-2 py-1.5 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          aria-label="Enviar consulta"
          onClick={() => {
            send(text);
            setText("");
          }}
          disabled={!text.trim() || typing}
          className="rounded-[6px] bg-primary px-2.5 py-1.5 text-[13px] leading-none text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ▷
        </button>
      </div>
    </aside>
  );
}