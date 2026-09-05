import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChat } from "@/context/ChatRunnerContext";
import { fichasTecnicas, procedimientos, type FichaTecnica } from "@/data/docs.data";

export const Route = createFileRoute("/documentacion")({
  head: () => ({
    meta: [
      { title: "Documentación · HPS-DOOM" },
      {
        name: "description",
        content: "Fichas técnicas, curvas de fábrica e instructivos de bombas HPS.",
      },
      { property: "og:title", content: "Documentación · HPS-DOOM" },
      {
        property: "og:description",
        content: "Fichas técnicas, curvas de fábrica e instructivos de bombas HPS.",
      },
    ],
  }),
  component: DocumentacionPage,
});

/**
 * Sección plegable cuya barra entera es el disparador: se abre y cierra al
 * pulsar en cualquier punto, no sólo sobre la flecha.
 */
function BarraPlegable({
  titulo,
  cuenta,
  id,
  abiertaPorDefecto = false,
  children,
}: {
  titulo: string;
  cuenta: number;
  id: string;
  abiertaPorDefecto?: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);

  return (
    <section className="panel p-3">
      <h2>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={id}
          className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-[6px] px-1 py-0.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="panel-title shrink-0">{titulo}</span>
          <span className="num shrink-0 rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] text-ink-secondary">
            {cuenta}
          </span>
          {abierta ? (
            <ChevronUp size={14} className="ml-auto shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown size={14} className="ml-auto shrink-0 text-muted-foreground" aria-hidden />
          )}
        </button>
      </h2>
      <div id={id} hidden={!abierta} className="mt-3">
        {children}
      </div>
    </section>
  );
}

const botonClase =
  "flex items-center gap-1.5 rounded-[6px] border border-border px-2 py-1 text-[11px] text-ink-secondary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function DocumentacionPage() {
  const { setActiveContext } = useChat();
  const [curva, setCurva] = useState<FichaTecnica | null>(null);

  useEffect(() => setActiveContext("general"), [setActiveContext]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {/* ---------- Fichas técnicas: curva de fábrica por hidráulica ---------- */}
      <BarraPlegable
        titulo="FICHAS TÉCNICAS"
        cuenta={fichasTecnicas.length}
        id="fichas-tecnicas"
        abiertaPorDefecto
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {fichasTecnicas.map((f) => (
            <article key={f.id} className="panel flex gap-3 p-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-foreground">
                  Curva {f.modelo} · {f.etapas} etapas
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {f.unidades.map((u) => (
                    <span
                      key={u}
                      className="num rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] text-ink-secondary"
                    >
                      {u}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setCurva(f)} className={botonClase}>
                    <ImageIcon size={11} aria-hidden />
                    Ver curva
                  </button>
                  <a
                    href={f.documento}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={botonClase}
                  >
                    <ExternalLink size={11} aria-hidden />
                    Descargar
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </BarraPlegable>

      {/* ---------- Instructivos de la intranet ---------- */}
      <BarraPlegable titulo="INSTRUCTIVOS" cuenta={procedimientos.length} id="instructivos">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {procedimientos.map((p) => (
            <article key={p.id} className="panel flex gap-3 p-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-foreground">{p.titulo}</p>
                <span className="num mt-1 inline-block rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] text-ink-secondary">
                  {p.codigo}
                </span>
                <div className="mt-2">
                  <a
                    href={p.documento}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={botonClase}
                  >
                    <ExternalLink size={11} aria-hidden />
                    Abrir instructivo
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </BarraPlegable>

      {/* Visor de la curva de fábrica: sólo la imagen. */}
      <Dialog open={!!curva} onOpenChange={(o) => !o && setCurva(null)}>
        <DialogContent className="max-h-[88vh] max-w-[1000px] overflow-auto">
          <DialogHeader>
            <DialogTitle className="panel-title">
              {curva ? `CURVA ${curva.modelo} · ${curva.etapas} ETAPAS` : ""}
            </DialogTitle>
          </DialogHeader>
          {curva ? (
            <>
              <img
                src={curva.imagen}
                alt={`Curva de fábrica ${curva.modelo} de ${curva.etapas} etapas`}
                className="w-full rounded-[6px] border border-border bg-white"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{curva.unidades.join(" · ")}</p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
