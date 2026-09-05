import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChat } from "@/context/ChatRunnerContext";
import { fichasTecnicas, procedimientos, type FichaTecnica } from "@/data/docs.data";
import { docsMock, linksMock, type DocCategoria, type DocItem } from "@/data/docs.mock";

export const Route = createFileRoute("/documentacion")({
  head: () => ({
    meta: [
      { title: "Documentación · HPS-DOOM" },
      {
        name: "description",
        content: "Fichas técnicas, curvas de fábrica y procedimientos de bombas HPS.",
      },
      { property: "og:title", content: "Documentación · HPS-DOOM" },
      {
        property: "og:description",
        content: "Fichas técnicas, curvas de fábrica y procedimientos de bombas HPS.",
      },
    ],
  }),
  component: DocumentacionPage,
});

const CATEGORIAS: DocCategoria[] = [
  "Manuales",
  "Curvas",
  "Fichas técnicas",
  "Procedimientos",
  "Normativa",
];

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
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<DocCategoria | null>(null);
  const [visor, setVisor] = useState<DocItem | null>(null);
  const [curva, setCurva] = useState<FichaTecnica | null>(null);

  useEffect(() => setActiveContext("general"), [setActiveContext]);

  const docs = useMemo(
    () =>
      docsMock.filter(
        (d) =>
          (!categoria || d.categoria === categoria) &&
          d.nombre.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query, categoria],
  );

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
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          «Ver curva» abre la imagen de fábrica sin salir de la aplicación. «Descargar» lleva al PDF
          completo en SharePoint, que pide sesión corporativa.
        </p>
      </BarraPlegable>

      {/* ---------- Procedimientos: instructivos de la intranet ---------- */}
      <BarraPlegable titulo="PROCEDIMIENTOS" cuenta={procedimientos.length} id="procedimientos">
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
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          Los instructivos viven en la intranet de Sertecpet y piden sesión corporativa.
        </p>
      </BarraPlegable>

      {/* ---------- Bibliografía: bloques pendientes de definir ---------- */}
      <section className="panel p-3">
        <h2 className="panel-title mb-2">BIBLIOGRAFÍA</h2>
        <div className="flex items-center gap-2 rounded-[6px] border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
          <Search size={14} className="text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar documento"
            className="w-full bg-transparent text-[13px] text-foreground outline-none"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIAS.map((c) => {
            const activo = categoria === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(activo ? null : c)}
                aria-pressed={activo}
                className="rounded-[4px] px-2 py-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={
                  activo
                    ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
                    : { backgroundColor: "var(--secondary)", color: "var(--ink-secondary)" }
                }
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {docs.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">Sin resultados.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {docs.map((d) => (
            <article key={d.id} className="panel flex gap-3 p-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-foreground">{d.nombre}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] text-ink-secondary">
                    {d.categoria}
                  </span>
                  <span className="num text-[11px] text-muted-foreground">
                    {d.tamano} · {d.fecha}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setVisor(d)} className={botonClase}>
                    Ver
                  </button>
                  <button
                    type="button"
                    // TODO(backend): conectar descarga
                    className={botonClase}
                  >
                    Descargar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {linksMock.length > 0 ? (
        <section className="panel p-3">
          <h2 className="panel-title mb-2">ENLACES EXTERNOS</h2>
          <ul>
            {linksMock.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-2 border-t border-border py-1.5 first:border-t-0"
              >
                <span className="text-[13px] text-foreground">{l.titulo}</span>
                <span className="text-[11px] text-muted-foreground">{l.dominio}</span>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir ${l.titulo}`}
                  className="ml-auto text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink size={14} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <Dialog open={!!visor} onOpenChange={(o) => !o && setVisor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="panel-title">{visor?.nombre ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="flex h-[320px] items-center justify-center rounded-[6px] border border-border bg-secondary text-[12px] text-muted-foreground">
            Visor no disponible.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
