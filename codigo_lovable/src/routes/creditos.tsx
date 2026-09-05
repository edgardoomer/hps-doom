import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { SocialLinks } from "@/components/SocialLinks";
import { useChat } from "@/context/ChatRunnerContext";

export const Route = createFileRoute("/creditos")({
  head: () => ({
    meta: [
      { title: "Créditos · HPS-DOOM" },
      {
        name: "description",
        content: "Autor, tecnologías y fuentes de datos del proyecto HPS-DOOM.",
      },
      { property: "og:title", content: "Créditos · HPS-DOOM" },
      {
        property: "og:description",
        content: "Autor, tecnologías y fuentes de datos del proyecto HPS-DOOM.",
      },
    ],
  }),
  component: CreditosPage,
});

// Editable: nombre y rol que se muestran en la ficha de autor.
const AUTOR = {
  nombre: "Edgar Fernando",
  rol: "Operador de EPF",
  correo: "edgar.izurieta@sertecpet.com",
};

const TECNOLOGIAS = [
  "React 19",
  "TypeScript",
  "TanStack Start",
  "Tailwind CSS",
  "Recharts",
  "shadcn/ui",
];

function CreditosPage() {
  const { setActiveContext } = useChat();
  useEffect(() => setActiveContext("general"), [setActiveContext]);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 overflow-y-auto">
      <section className="panel p-4">
        <p className="text-[18px] font-medium uppercase tracking-[0.08em] text-foreground">
          HPS-DOOM
        </p>
        <p className="num text-[12px] text-muted-foreground">v0.1</p>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Monitoreo y análisis de bombas horizontales de superficie.
        </p>
      </section>

      <section className="panel p-4">
        <h2 className="panel-title mb-3">AUTOR</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            src="/foto.jpg"
            alt={`Retrato de ${AUTOR.nombre}`}
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded-[12px] border border-border object-cover"
            style={{ boxShadow: "var(--shadow-panel)" }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div>
              <p className="text-[15px] font-medium text-foreground">{AUTOR.nombre}</p>
              <p className="text-[12px] text-ink-secondary">{AUTOR.rol}</p>
            </div>
            <SocialLinks />
            <a
              href={`mailto:${AUTOR.correo}`}
              className="flex w-fit items-center gap-1.5 text-[12px] text-ink-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mail size={13} aria-hidden />
              {AUTOR.correo}
            </a>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="panel-title mb-2">TECNOLOGÍAS</h2>
        <div className="flex flex-wrap gap-1.5">
          {TECNOLOGIAS.map((t) => (
            <span
              key={t}
              className="rounded-[4px] bg-secondary px-2 py-1 text-[11px] text-ink-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="panel-title mb-2">FUENTES DE DATOS</h2>
        <p className="text-[13px] text-ink-secondary">
          Curvas y fichas técnicas Baker Hughes HPump facilitadas por Sertecpet S.A.
        </p>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Las curvas por frecuencia se derivan de la curva de fábrica de 60 Hz mediante leyes de
          afinidad.
        </p>
      </section>

      <footer className="flex items-center justify-between px-1 pb-2 text-[11px] text-muted-foreground">
        <span>© 2026 HPS-DOOM</span>
        <a
          href={`mailto:${AUTOR.correo}`}
          className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {AUTOR.correo}
        </a>
      </footer>
    </div>
  );
}
