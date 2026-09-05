import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FileText, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChat } from "@/context/ChatRunnerContext";
import { docsMock, linksMock, type DocCategoria, type DocItem } from "@/data/docs.mock";

export const Route = createFileRoute("/documentacion")({
  head: () => ({
    meta: [
      { title: "Documentación · HPS-DOOM" },
      {
        name: "description",
        content: "Manuales, curvas de fábrica, fichas técnicas y procedimientos de bombas HPS.",
      },
      { property: "og:title", content: "Documentación · HPS-DOOM" },
      {
        property: "og:description",
        content: "Manuales, curvas, fichas técnicas y procedimientos de bombas HPS.",
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

function DocumentacionPage() {
  const { setActiveContext } = useChat();
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<DocCategoria | null>(null);
  const [visor, setVisor] = useState<DocItem | null>(null);

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
      <section className="panel p-3">
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
                  <button
                    type="button"
                    onClick={() => setVisor(d)}
                    className="rounded-[6px] border border-border px-2 py-1 text-[11px] text-ink-secondary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    // TODO(backend): conectar descarga
                    className="rounded-[6px] border border-border px-2 py-1 text-[11px] text-ink-secondary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
