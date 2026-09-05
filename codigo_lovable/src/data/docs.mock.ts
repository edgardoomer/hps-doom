export type DocCategoria =
  "Manuales" | "Curvas" | "Fichas técnicas" | "Procedimientos" | "Normativa";

export interface DocItem {
  id: string;
  nombre: string;
  categoria: DocCategoria;
  tipo: "pdf" | "xlsx" | "dwg";
  tamano: string;
  fecha: string;
}

export interface DocLink {
  id: string;
  titulo: string;
  dominio: string;
  url: string;
}

/**
 * Bloques de bibliografía. Se dejan 4 entradas de referencia para editarlas
 * con las fuentes definitivas.
 */
export const docsMock: DocItem[] = [
  {
    id: "d1",
    nombre: "Referencia 1 — por definir",
    categoria: "Manuales",
    tipo: "pdf",
    tamano: "—",
    fecha: "—",
  },
  {
    id: "d2",
    nombre: "Referencia 2 — por definir",
    categoria: "Curvas",
    tipo: "pdf",
    tamano: "—",
    fecha: "—",
  },
  {
    id: "d3",
    nombre: "Referencia 3 — por definir",
    categoria: "Fichas técnicas",
    tipo: "pdf",
    tamano: "—",
    fecha: "—",
  },
  {
    id: "d4",
    nombre: "Referencia 4 — por definir",
    categoria: "Normativa",
    tipo: "pdf",
    tamano: "—",
    fecha: "—",
  },
];

export const linksMock: DocLink[] = [];
