/**
 * HPS-DOOM — Árbol de sucesos.
 *
 * Construye y dibuja el grafo causa-efecto de eventos.js. Sin dependencias:
 * las aristas son un SVG y los nodos son divs posicionados encima, así el
 * texto se ve nítido y se puede seleccionar.
 *
 * Este módulo no importa nada a propósito: recibe los diccionarios como
 * argumento. Eso permite usarlo dentro de la app (importando eventos.js) y
 * también inlinearlo en un HTML autocontenido (generarArbolHtml.mjs).
 *
 *   import { EVENTOS, DANOS, FAMILIAS } from "./eventos.js";
 *   import { construirGrafo, dibujarArbol } from "./arbolEventos.js";
 *
 *   const grafo = construirGrafo({ eventos: EVENTOS, danos: DANOS });
 *   const api = dibujarArbol(document.querySelector("#arbol"), grafo, {
 *     familias: FAMILIAS,
 *     glosario: GLOSARIO,
 *     alSeleccionar: (nodo) => console.log(nodo.id),
 *   });
 *
 * El grafo tiene ciclos reales (por ejemplo cavitación → desgaste → menos
 * presión → más caudal → más cavitación). No se rompen: se dibujan aparte,
 * punteados, como aristas de realimentación.
 */

// ---------------------------------------------------------------------------
// 1. Construcción del grafo
// ---------------------------------------------------------------------------

const SIMBOLO_EMPUJE = {
  upthrust: "↑",
  downthrust: "↓",
  variable: "↕",
  transicion: "↕",
  ninguno: "·",
};

const COLOR_EMPUJE = {
  upthrust: "#dc2626",
  downthrust: "#d97706",
  variable: "#7c3aed",
  transicion: "#7c3aed",
  ninguno: "#94a3b8",
};

/**
 * Convierte los diccionarios en {nodos, aristas} listos para dibujar.
 *
 * @param {object} opciones
 * @param {Record<string, any>} opciones.eventos
 * @param {Record<string, any>} [opciones.danos]
 * @param {boolean} [opciones.incluirDanos=true]  Añade una columna final con los daños.
 * @param {string[]} [opciones.soloFamilias]      Filtra por familia.
 */
export function construirGrafo({
  eventos,
  danos = {},
  incluirDanos = true,
  soloFamilias = null,
} = {}) {
  const nodos = [];
  const aristas = [];

  const pasaFiltro = (ev) => !soloFamilias || soloFamilias.includes(ev.familia);

  for (const ev of Object.values(eventos)) {
    if (!pasaFiltro(ev)) continue;
    nodos.push({
      id: ev.id,
      clase: "evento",
      titulo: ev.titulo,
      familia: ev.familia,
      rol: ev.rol,
      urgencia: ev.urgencia,
      empuje: ev.empujeAxial?.tipo ?? "ninguno",
      empujeSeveridad: ev.empujeAxial?.severidad ?? "no aplica",
      simbolo: SIMBOLO_EMPUJE[ev.empujeAxial?.tipo] ?? SIMBOLO_EMPUJE.ninguno,
      colorEmpuje: COLOR_EMPUJE[ev.empujeAxial?.tipo] ?? COLOR_EMPUJE.ninguno,
      datos: ev,
    });
  }

  const existe = new Set(nodos.map((n) => n.id));

  for (const ev of Object.values(eventos)) {
    if (!existe.has(ev.id)) continue;
    for (const destino of ev.llevaA ?? []) {
      if (!existe.has(destino)) continue;
      aristas.push({ desde: ev.id, hasta: destino, tipo: "causa" });
    }
  }

  if (incluirDanos) {
    const usados = new Set();
    for (const ev of Object.values(eventos)) {
      if (!existe.has(ev.id)) continue;
      for (const d of ev.danos ?? []) if (danos[d]) usados.add(d);
    }
    for (const id of usados) {
      const d = danos[id];
      nodos.push({
        id,
        clase: "dano",
        titulo: d.titulo,
        familia: "dano",
        rol: "dano",
        urgencia: d.gravedad,
        gravedad: d.gravedad,
        empuje: "ninguno",
        simbolo: "",
        colorEmpuje: COLOR_EMPUJE.ninguno,
        datos: d,
      });
    }
    for (const ev of Object.values(eventos)) {
      if (!existe.has(ev.id)) continue;
      for (const d of ev.danos ?? []) {
        if (!usados.has(d)) continue;
        aristas.push({ desde: ev.id, hasta: d, tipo: "dano" });
      }
    }
  }

  const grafo = { nodos, aristas };
  calcularCapas(grafo);
  ordenarCapas(grafo);
  return grafo;
}

/**
 * Asigna a cada nodo su columna.
 *
 * El grafo es denso y con ciclos, así que una capa por cada salto produciría
 * diez columnas y un dibujo ilegible. En vez de eso las columnas son
 * semánticas y se limitan a seis: causa raíz, tres niveles de propagación,
 * falla y daño. La profundidad bruta se calcula igual (camino más largo desde
 * las raíces) pero se recorta a MAX_EVENTO.
 *
 * Las aristas que en la profundidad bruta apuntan hacia atrás se marcan como
 * realimentación: son ciclos reales del proceso y se dibujan aparte.
 */
const MAX_EVENTO = 4;

function calcularCapas(grafo) {
  const porId = new Map(grafo.nodos.map((n) => [n.id, n]));
  const entrantes = new Map(grafo.nodos.map((n) => [n.id, []]));
  for (const a of grafo.aristas) {
    if (porId.has(a.hasta) && porId.get(a.desde)?.clase === "evento") {
      entrantes.get(a.hasta).push(a.desde);
    }
  }

  const bruto = new Map();
  const enCurso = new Set();

  const resolver = (id) => {
    if (bruto.has(id)) return bruto.get(id);
    if (enCurso.has(id)) return 0; // ciclo: lo cortamos sólo para este cálculo
    enCurso.add(id);
    let maximo = -1;
    for (const padre of entrantes.get(id) ?? []) {
      if (enCurso.has(padre)) continue;
      maximo = Math.max(maximo, resolver(padre));
    }
    enCurso.delete(id);
    const valor = maximo + 1;
    bruto.set(id, valor);
    return valor;
  };

  for (const n of grafo.nodos) n.profundidad = resolver(n.id);

  for (const n of grafo.nodos) {
    if (n.clase === "dano") n.capa = MAX_EVENTO + 1;
    else if (n.rol === "causaRaiz") n.capa = 0;
    else if (n.rol === "falla") n.capa = Math.max(MAX_EVENTO, Math.min(n.profundidad, MAX_EVENTO));
    else n.capa = Math.min(Math.max(n.profundidad, 1), MAX_EVENTO - 1);
  }

  for (const a of grafo.aristas) {
    const d = porId.get(a.desde);
    const h = porId.get(a.hasta);
    a.retro = Boolean(d && h && h.profundidad <= d.profundidad && h.clase !== "dano");
  }

  grafo.capas = [];
  for (const n of grafo.nodos) (grafo.capas[n.capa] ||= []).push(n);
  for (let i = 0; i < grafo.capas.length; i += 1) grafo.capas[i] ||= [];
}

/**
 * Ordena los nodos dentro de cada columna para que se crucen menos líneas.
 * Heurística de baricentro, cuatro pasadas de ida y vuelta: suficiente para
 * un grafo de este tamaño y sin dependencias.
 */
function ordenarCapas(grafo, pasadas = 4) {
  const porId = new Map(grafo.nodos.map((n) => [n.id, n]));
  const salientes = new Map(grafo.nodos.map((n) => [n.id, []]));
  const entrantes = new Map(grafo.nodos.map((n) => [n.id, []]));
  for (const a of grafo.aristas) {
    if (a.retro) continue;
    salientes.get(a.desde)?.push(a.hasta);
    entrantes.get(a.hasta)?.push(a.desde);
  }

  const indice = new Map();
  const reindexar = () => {
    for (const capa of grafo.capas)
      capa.forEach((n, i) => indice.set(n.id, i));
  };
  reindexar();

  const baricentro = (id, mapa) => {
    const vecinos = mapa.get(id) ?? [];
    if (!vecinos.length) return indice.get(id) ?? 0;
    const suma = vecinos.reduce((acc, v) => acc + (indice.get(v) ?? 0), 0);
    return suma / vecinos.length;
  };

  for (let p = 0; p < pasadas; p += 1) {
    const haciaAdelante = p % 2 === 0;
    const orden = haciaAdelante
      ? grafo.capas.map((_, i) => i)
      : grafo.capas.map((_, i) => i).reverse();
    for (const i of orden) {
      const mapa = haciaAdelante ? entrantes : salientes;
      grafo.capas[i] = grafo.capas[i]
        .map((n) => ({ n, b: baricentro(n.id, mapa) }))
        .sort((x, y) => x.b - y.b)
        .map((x) => x.n);
      reindexar();
    }
  }

  grafo.capas.forEach((capa, c) =>
    capa.forEach((n, f) => {
      n.columna = c;
      n.fila = f;
      porId.set(n.id, n);
    })
  );
}

// ---------------------------------------------------------------------------
// 2. Dibujo
// ---------------------------------------------------------------------------

const NS = "http://www.w3.org/2000/svg";

export const CSS_ARBOL = `
.arbol-raiz { --fondo:#f6f7f9; --panel:#ffffff; --borde:#dfe3e8; --texto:#1b1f24;
  --suave:#5c6672; --tenue:#9aa4b0; --linea:#c3cad3; --realce:#1d4ed8;
  --causa:#0f766e; --efecto:#b91c1c;
  display:flex; height:100%; min-height:520px; background:var(--fondo);
  color:var(--texto); font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
@media (prefers-color-scheme: dark) { .arbol-raiz:not([data-tema="claro"]) {
  --fondo:#12161b; --panel:#1a2028; --borde:#2c3540; --texto:#e6eaef;
  --suave:#9aa6b4; --tenue:#6b7684; --linea:#3a4550; --realce:#60a5fa;
  --causa:#5eead4; --efecto:#fca5a5; } }
.arbol-raiz[data-tema="oscuro"] { --fondo:#12161b; --panel:#1a2028; --borde:#2c3540;
  --texto:#e6eaef; --suave:#9aa6b4; --tenue:#6b7684; --linea:#3a4550;
  --realce:#60a5fa; --causa:#5eead4; --efecto:#fca5a5; }

.arbol-lienzo-wrap { position:relative; flex:1; overflow:hidden; cursor:grab; }
.arbol-lienzo-wrap.arrastrando { cursor:grabbing; }
.arbol-lienzo { position:absolute; top:0; left:0; transform-origin:0 0; }
.arbol-aristas { position:absolute; top:0; left:0; overflow:visible; pointer-events:none; }
.arbol-arista { fill:none; stroke:var(--linea); stroke-width:1.5; transition:stroke .15s,opacity .15s,stroke-width .15s; }
.arbol-arista.retro { stroke-dasharray:5 4; opacity:.55; }
.arbol-arista.dano { stroke-dasharray:2 3; opacity:.4; }
.arbol-arista.apagada { opacity:.07; }
.arbol-arista.causa-activa { stroke:var(--causa); stroke-width:2.5; opacity:1; }
.arbol-arista.efecto-activo { stroke:var(--efecto); stroke-width:2.5; opacity:1; }

.arbol-nodo { position:absolute; box-sizing:border-box; background:var(--panel);
  border:1px solid var(--borde); border-left-width:4px; border-radius:8px;
  padding:8px 10px; cursor:pointer; transition:opacity .15s,box-shadow .15s,transform .1s;
  box-shadow:0 1px 2px rgba(0,0,0,.05); }
.arbol-nodo:hover { transform:translateY(-1px); box-shadow:0 4px 10px rgba(0,0,0,.12); }
.arbol-nodo.apagado { opacity:.16; }
.arbol-nodo.seleccionado { box-shadow:0 0 0 2px var(--realce),0 4px 12px rgba(0,0,0,.15); }
.arbol-nodo.es-causa { box-shadow:0 0 0 2px var(--causa); }
.arbol-nodo.es-efecto { box-shadow:0 0 0 2px var(--efecto); }
.arbol-nodo-cab { display:flex; align-items:center; gap:6px; margin-bottom:3px; }
.arbol-nodo-id { font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;
  letter-spacing:.03em; color:var(--tenue); }
.arbol-nodo-empuje { margin-left:auto; font-weight:700; font-size:13px; line-height:1; }
.arbol-nodo-titulo { font-size:12.5px; font-weight:550; line-height:1.35; }
.arbol-nodo.dano { border-style:dashed; background:transparent; }
.arbol-nodo.dano .arbol-nodo-titulo { font-weight:450; color:var(--suave); }

.arbol-capa-rotulo { position:absolute; font:600 10px/1 -apple-system,sans-serif;
  text-transform:uppercase; letter-spacing:.08em; color:var(--tenue); white-space:nowrap; }

.arbol-panel { width:340px; flex:0 0 340px; border-left:1px solid var(--borde);
  background:var(--panel); overflow-y:auto; padding:16px 18px 40px; }
.arbol-panel h2 { margin:0 0 2px; font-size:15px; line-height:1.3; }
.arbol-panel h3 { margin:16px 0 5px; font-size:10.5px; text-transform:uppercase;
  letter-spacing:.07em; color:var(--tenue); font-weight:600; }
.arbol-panel p { margin:0 0 8px; font-size:12.5px; color:var(--suave); }
.arbol-panel ul { margin:0; padding-left:16px; font-size:12.5px; color:var(--suave); }
.arbol-panel li { margin-bottom:4px; }
.arbol-panel .meta { font:600 10px/1 ui-monospace,monospace; color:var(--tenue);
  letter-spacing:.04em; margin-bottom:8px; display:block; }
.arbol-chip { display:inline-block; font:600 10px/1 ui-monospace,monospace;
  padding:4px 7px; margin:0 4px 4px 0; border:1px solid var(--borde);
  border-radius:5px; cursor:pointer; background:transparent; color:var(--texto); }
.arbol-chip:hover { border-color:var(--realce); color:var(--realce); }
.arbol-aviso { border-left:3px solid #d97706; padding:7px 10px; margin:8px 0;
  background:rgba(217,119,6,.08); font-size:12px; border-radius:0 5px 5px 0; }
.arbol-aviso.corregir { border-left-color:var(--realce); background:rgba(29,78,216,.08); }
.arbol-vacio { color:var(--tenue); font-size:12.5px; }

.arbol-barra { position:absolute; top:12px; left:12px; right:12px; z-index:5;
  display:flex; gap:6px; flex-wrap:wrap; align-items:center; pointer-events:none; }
.arbol-barra > * { pointer-events:auto; }
.arbol-filtro { font:500 11px/1 -apple-system,sans-serif; padding:5px 9px;
  border:1px solid var(--borde); border-radius:14px; background:var(--panel);
  color:var(--suave); cursor:pointer; }
.arbol-filtro[aria-pressed="true"] { color:#fff; border-color:transparent; }
.arbol-busqueda { font:12px -apple-system,sans-serif; padding:5px 9px; width:150px;
  border:1px solid var(--borde); border-radius:14px; background:var(--panel); color:var(--texto); }
.arbol-boton { font:500 11px/1 -apple-system,sans-serif; padding:5px 9px;
  border:1px solid var(--borde); border-radius:14px; background:var(--panel);
  color:var(--suave); cursor:pointer; }
.arbol-boton:hover { border-color:var(--realce); color:var(--realce); }
`;

/**
 * Dibuja el árbol dentro de un contenedor.
 *
 * @param {HTMLElement} contenedor
 * @param {ReturnType<typeof construirGrafo>} grafo
 * @param {object} [opciones]
 * @param {Record<string,{titulo:string,color:string}>} [opciones.familias]
 * @param {Record<string,any>} [opciones.glosario]
 * @param {(nodo:any)=>void} [opciones.alSeleccionar]
 * @param {boolean} [opciones.panel=true]  Muestra el panel lateral de detalle.
 * @returns {{seleccionar:Function, limpiar:Function, ajustar:Function, destruir:Function, grafo:object}}
 */
export function dibujarArbol(contenedor, grafo, opciones = {}) {
  const {
    familias = {},
    glosario = {},
    alSeleccionar = null,
    panel: conPanel = true,
    anchoNodo = 208,
    separacionColumnas = 96,
    separacionFilas = 14,
    margen = 56,
  } = opciones;

  const ROTULOS = [
    "Causa raíz",
    "Primer síntoma",
    "Se propaga",
    "Consecuencia",
    "Falla",
    "Daño acumulado",
  ];

  contenedor.innerHTML = "";
  contenedor.classList.add("arbol-raiz");

  const wrap = crear("div", "arbol-lienzo-wrap");
  const lienzo = crear("div", "arbol-lienzo");
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "arbol-aristas");
  lienzo.appendChild(svg);
  wrap.appendChild(lienzo);
  contenedor.appendChild(wrap);

  const panel = conPanel ? crear("aside", "arbol-panel") : null;
  if (panel) contenedor.appendChild(panel);

  // --- barra de controles -------------------------------------------------
  const barra = crear("div", "arbol-barra");
  const busqueda = crear("input", "arbol-busqueda");
  busqueda.placeholder = "Buscar…";
  busqueda.type = "search";
  barra.appendChild(busqueda);

  const familiasPresentes = [...new Set(grafo.nodos.map((n) => n.familia))].filter(
    (f) => familias[f]
  );
  const activas = new Set(familiasPresentes);
  const botones = new Map();
  for (const f of familiasPresentes) {
    const b = crear("button", "arbol-filtro");
    b.textContent = familias[f].titulo;
    b.setAttribute("aria-pressed", "true");
    b.style.background = familias[f].color;
    b.style.color = "#fff";
    b.addEventListener("click", () => {
      if (activas.has(f)) activas.delete(f);
      else activas.add(f);
      const on = activas.has(f);
      b.setAttribute("aria-pressed", String(on));
      b.style.background = on ? familias[f].color : "";
      b.style.color = on ? "#fff" : "";
      aplicarFiltros();
    });
    botones.set(f, b);
    barra.appendChild(b);
  }

  const btnAjustar = crear("button", "arbol-boton");
  btnAjustar.textContent = "Encuadrar";
  btnAjustar.addEventListener("click", () => ajustar());
  barra.appendChild(btnAjustar);

  const btnLimpiar = crear("button", "arbol-boton");
  btnLimpiar.textContent = "Limpiar";
  btnLimpiar.addEventListener("click", () => limpiar());
  barra.appendChild(btnLimpiar);

  wrap.appendChild(barra);

  // --- nodos --------------------------------------------------------------
  const elementos = new Map();
  const porId = new Map(grafo.nodos.map((n) => [n.id, n]));

  for (const n of grafo.nodos) {
    const el = crear("div", `arbol-nodo ${n.clase}`);
    el.dataset.id = n.id;
    el.style.width = `${anchoNodo}px`;
    const color = familias[n.familia]?.color ?? "#94a3b8";
    el.style.borderLeftColor = color;

    const cab = crear("div", "arbol-nodo-cab");
    const id = crear("span", "arbol-nodo-id");
    id.textContent = n.id;
    id.style.color = color;
    cab.appendChild(id);
    if (n.simbolo) {
      const emp = crear("span", "arbol-nodo-empuje");
      emp.textContent = n.simbolo;
      emp.style.color = n.colorEmpuje;
      emp.title = `Empuje: ${n.empuje} (${n.empujeSeveridad})`;
      cab.appendChild(emp);
    }
    el.appendChild(cab);

    const tit = crear("div", "arbol-nodo-titulo");
    tit.textContent = n.titulo;
    el.appendChild(tit);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      seleccionar(n.id);
    });
    lienzo.appendChild(el);
    elementos.set(n.id, el);
  }

  // --- posiciones (se miden después de insertar, para respetar el alto real)
  const rotulos = [];
  let ancho = 0;
  let alto = 0;

  const MAX_FILAS = 10;

  function posicionar() {
    let x = margen;
    let maxAlto = 0;
    for (let c = 0; c < grafo.capas.length; c += 1) {
      const capa = grafo.capas[c].filter((n) => !n.oculto);
      // Una columna con muchos nodos se parte en sub-columnas: si no, el
      // dibujo queda altísimo y al encuadrar no se lee nada.
      const sub = Math.max(1, Math.ceil(capa.length / MAX_FILAS));
      const porSub = Math.ceil(capa.length / sub);
      const xCapa = x;
      let y = margen;
      capa.forEach((n, i) => {
        const s = Math.floor(i / porSub);
        if (i % porSub === 0) y = margen;
        const el = elementos.get(n.id);
        const h = el.offsetHeight || 52;
        n.x = xCapa + s * (anchoNodo + 24);
        n.y = y;
        n.w = anchoNodo;
        n.h = h;
        el.style.left = `${n.x}px`;
        el.style.top = `${y}px`;
        y += h + separacionFilas;
        maxAlto = Math.max(maxAlto, y);
      });
      if (rotulos[c]) {
        rotulos[c].style.left = `${xCapa}px`;
        rotulos[c].style.top = `${margen - 26}px`;
        rotulos[c].style.display = capa.length ? "" : "none";
      }
      x = xCapa + sub * (anchoNodo + 24) - 24 + separacionColumnas;
    }
    ancho = x - separacionColumnas + margen;
    alto = maxAlto + margen;
    svg.setAttribute("width", ancho);
    svg.setAttribute("height", alto);
    lienzo.style.width = `${ancho}px`;
    lienzo.style.height = `${alto}px`;
  }

  for (let c = 0; c < grafo.capas.length; c += 1) {
    const r = crear("div", "arbol-capa-rotulo");
    const esDano = grafo.capas[c].some((n) => n.clase === "dano");
    r.textContent = esDano ? "Daño a la bomba" : ROTULOS[c] ?? `Nivel ${c}`;
    lienzo.appendChild(r);
    rotulos.push(r);
  }

  posicionar();

  // --- aristas ------------------------------------------------------------
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <marker id="ar-flecha" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6"
      markerHeight="6" orient="auto-start-reverse">
      <path d="M0,1 L7,4 L0,7 z" fill="context-stroke"/>
    </marker>`;
  svg.appendChild(defs);

  const caminos = [];
  for (const a of grafo.aristas) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute(
      "class",
      `arbol-arista ${a.retro ? "retro" : ""} ${a.tipo === "dano" ? "dano" : ""}`
    );
    p.setAttribute("marker-end", "url(#ar-flecha)");
    svg.appendChild(p);
    caminos.push({ a, p });
  }

  function trazar() {
    for (const { a, p } of caminos) {
      const d = porId.get(a.desde);
      const h = porId.get(a.hasta);
      if (!d || !h || d.oculto || h.oculto) {
        p.setAttribute("d", "");
        continue;
      }
      const x1 = d.x + d.w;
      const y1 = d.y + d.h / 2;
      const x2 = h.x;
      const y2 = h.y + h.h / 2;
      const esRetorno = a.retro || x2 < x1 + 24;
      if (esRetorno) {
        // Realimentación: sale por abajo y vuelve, para no confundirse con el flujo.
        const caida = Math.max(40, Math.abs(y2 - y1) * 0.4 + 30);
        const mx = (d.x + h.x + h.w) / 2;
        p.setAttribute(
          "d",
          `M ${d.x + d.w / 2} ${d.y + d.h} C ${d.x + d.w / 2} ${y1 + caida}, ` +
            `${mx} ${Math.max(y1, y2) + caida}, ${h.x + h.w / 2} ${h.y + h.h}`
        );
      } else {
        const dx = Math.max(28, (x2 - x1) * 0.45);
        p.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      }
    }
  }
  trazar();

  // --- zoom y desplazamiento ---------------------------------------------
  let escala = 1;
  let tx = 0;
  let ty = 0;

  function aplicarTransformacion() {
    lienzo.style.transform = `translate(${tx}px, ${ty}px) scale(${escala})`;
  }

  function ajustar() {
    const cw = wrap.clientWidth || 900;
    const ch = wrap.clientHeight || 600;
    escala = Math.min(cw / ancho, ch / alto, 1);
    escala = Math.max(escala, 0.18);
    tx = Math.max(0, (cw - ancho * escala) / 2);
    // Anclado arriba: es un diagrama que se lee de izquierda a derecha, y
    // centrarlo en vertical deja una franja vacía bajo la barra de filtros.
    // Se descuenta el alto real de la barra, que en pantallas angostas se
    // parte en dos líneas y taparía la primera columna.
    ty = (barra.offsetHeight || 32) + 26;
    aplicarTransformacion();
  }

  wrap.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nueva = Math.min(2.5, Math.max(0.12, escala * factor));
      tx = px - ((px - tx) * nueva) / escala;
      ty = py - ((py - ty) * nueva) / escala;
      escala = nueva;
      aplicarTransformacion();
    },
    { passive: false }
  );

  let arrastre = null;
  wrap.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".arbol-nodo, .arbol-barra")) return;
    arrastre = { x: e.clientX - tx, y: e.clientY - ty, id: e.pointerId };
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add("arrastrando");
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    tx = e.clientX - arrastre.x;
    ty = e.clientY - arrastre.y;
    aplicarTransformacion();
  });
  const soltar = (e) => {
    if (!arrastre) return;
    arrastre = null;
    wrap.classList.remove("arrastrando");
    if (e && wrap.hasPointerCapture?.(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
  };
  wrap.addEventListener("pointerup", soltar);
  wrap.addEventListener("pointercancel", soltar);
  wrap.addEventListener("click", (e) => {
    if (!e.target.closest(".arbol-nodo, .arbol-barra")) limpiar();
  });

  // --- selección y resaltado ---------------------------------------------
  let seleccionado = null;

  /** Distancia en saltos desde un nodo, hacia adelante o hacia atrás. */
  function distancias(id, campo) {
    const d = new Map();
    let frente = [id];
    let salto = 0;
    while (frente.length && salto < 12) {
      const siguiente = [];
      for (const actual of frente) {
        for (const a of grafo.aristas) {
          const vecino =
            campo === "efectos"
              ? a.desde === actual
                ? a.hasta
                : null
              : a.hasta === actual
                ? a.desde
                : null;
          if (!vecino || vecino === id || d.has(vecino)) continue;
          d.set(vecino, salto + 1);
          siguiente.push(vecino);
        }
      }
      frente = siguiente;
      salto += 1;
    }
    return d;
  }

  /**
   * Resalta la cadena del nodo elegido. El grafo es tan tupido que resaltar
   * la cadena entera dejaría casi todo encendido y no diría nada, así que el
   * énfasis baja con la distancia: vecino directo a plena luz, dos saltos algo
   * más apagado, y de tres en adelante casi al nivel del resto.
   */
  function seleccionar(id) {
    seleccionado = id;
    const causas = distancias(id, "causas");
    const efectos = distancias(id, "efectos");

    const opacidad = (n) => (n <= 1 ? 1 : n === 2 ? 0.62 : 0.25);

    for (const [nid, el] of elementos) {
      const dc = causas.get(nid);
      const de = efectos.get(nid);
      const cerca = Math.min(dc ?? 99, de ?? 99);
      const esYo = nid === id;
      el.classList.toggle("seleccionado", esYo);
      el.classList.toggle("es-causa", dc === 1);
      el.classList.toggle("es-efecto", de === 1);
      el.classList.remove("apagado");
      el.style.opacity = esYo ? "1" : cerca === 99 ? "0.12" : String(opacidad(cerca));
    }

    for (const { a, p } of caminos) {
      const dDesde = a.desde === id ? 0 : causas.get(a.desde) ?? efectos.get(a.desde);
      const dHasta = a.hasta === id ? 0 : causas.get(a.hasta) ?? efectos.get(a.hasta);
      const enCausas =
        (a.hasta === id || causas.has(a.hasta)) && (a.desde === id || causas.has(a.desde));
      const enEfectos =
        (a.desde === id || efectos.has(a.desde)) && (a.hasta === id || efectos.has(a.hasta));
      p.classList.toggle("causa-activa", enCausas && !enEfectos);
      p.classList.toggle("efecto-activo", enEfectos && !enCausas);
      const salto = Math.max(dDesde ?? 99, dHasta ?? 99);
      p.classList.toggle("apagada", !enCausas && !enEfectos);
      if (enCausas || enEfectos) p.style.opacity = String(opacidad(salto));
      else p.style.opacity = "";
    }

    if (panel) pintarPanel(porId.get(id), { causas, efectos });
    alSeleccionar?.(porId.get(id));
  }

  function limpiar() {
    seleccionado = null;
    for (const el of elementos.values()) {
      el.classList.remove("apagado", "seleccionado", "es-causa", "es-efecto");
      el.style.opacity = "";
    }
    for (const { p } of caminos) {
      p.classList.remove("apagada", "causa-activa", "efecto-activo");
      p.style.opacity = "";
    }
    if (panel) pintarAyuda();
  }

  function aplicarFiltros() {
    const q = busqueda.value.trim().toLowerCase();
    for (const n of grafo.nodos) {
      const porFamilia = n.clase === "dano" || activas.has(n.familia);
      const porTexto =
        !q || `${n.id} ${n.titulo}`.toLowerCase().includes(q);
      n.oculto = !(porFamilia && porTexto);
      elementos.get(n.id).style.display = n.oculto ? "none" : "";
    }
    for (const r of rotulos) r.style.display = "";
    posicionar();
    trazar();
  }
  busqueda.addEventListener("input", aplicarFiltros);

  // --- panel de detalle ---------------------------------------------------
  function pintarAyuda() {
    if (!panel) return;
    const total = grafo.nodos.filter((n) => n.clase === "evento").length;
    const danos = grafo.nodos.filter((n) => n.clase === "dano").length;
    panel.innerHTML = `
      <h2>Árbol de sucesos</h2>
      <p>${total} eventos de campo y ${danos} daños, encadenados por causa y efecto.</p>
      <h3>Cómo leerlo</h3>
      <p>Las columnas van de la causa raíz, a la izquierda, al daño en la bomba, a la derecha.
      Haz clic en cualquier nodo: se resalta en verde todo lo que pudo causarlo y en rojo
      todo lo que puede desencadenar.</p>
      <h3>Empuje axial</h3>
      <p><b style="color:${COLOR_EMPUJE.upthrust}">↑ upthrust</b> — demasiado caudal, poca presión.
      Es el que rompe bombas en horas.<br>
      <b style="color:${COLOR_EMPUJE.downthrust}">↓ downthrust</b> — poco caudal, mucha presión.
      Avisa antes de romper.<br>
      <b style="color:${COLOR_EMPUJE.variable}">↕ variable</b> — depende de hacia dónde se mueva el punto.</p>
      <h3>Líneas</h3>
      <p>Continua: lleva a. Punteada corta: daño que produce.
      Punteada larga por debajo: realimentación, el efecto vuelve sobre su causa.</p>
      <h3>Controles</h3>
      <p>Rueda para acercar, arrastra para mover, clic fuera para limpiar la selección.</p>`;
  }

  function pintarPanel(n, { causas, efectos }) {
    if (!panel || !n) return;
    const d = n.datos;
    const lista = (arr) =>
      arr?.length ? `<ul>${arr.map((x) => `<li>${escapar(x)}</li>`).join("")}</ul>` : "";
    const chips = (ids, etiqueta) =>
      ids?.length
        ? `<h3>${etiqueta}</h3>${ids
            .map((id) => {
              const t = porId.get(id)?.titulo ?? id;
              return `<button class="arbol-chip" data-ir="${id}" title="${escapar(t)}">${id}</button>`;
            })
            .join("")}`
        : "";

    if (n.clase === "dano") {
      panel.innerHTML = `
        <span class="meta">${d.id} · ${d.tipo} · ${d.gravedad}</span>
        <h2>${escapar(d.titulo)}</h2>
        <h3>Qué le pasa a la bomba</h3><p>${escapar(d.queLePasaALaBomba)}</p>
        <h3>Cómo se detecta</h3><p>${escapar(d.comoSeDetecta)}</p>
        <h3>Cuánto aguanta</h3><p>${escapar(d.ventanaDeTiempo)}</p>
        ${chips(d.derivaEn, "Deriva en")}
        ${chips([...causas.keys()].filter((c) => porId.get(c)?.clase === "evento" && causas.get(c) === 1), "Eventos que lo producen")}`;
    } else {
      const emp = d.empujeAxial ?? {};
      panel.innerHTML = `
        <span class="meta">${d.id} · ${d.familia} · ${d.urgencia}</span>
        <h2>${escapar(d.titulo)}</h2>
        <p><b>${escapar(d.preguntaGuia ?? "")}</b></p>
        <p>${escapar(d.significado ?? "")}</p>
        ${
          d.correccion
            ? `<div class="arbol-aviso">${escapar(d.correccion)}</div>`
            : ""
        }
        <h3>Empuje axial · ${escapar(emp.tipo ?? "")} (${escapar(emp.severidad ?? "")})</h3>
        <p>${escapar(emp.porQue ?? "")}</p>
        <h3>Causas probables</h3>${lista(d.causas)}
        <h3>Verificar</h3>${lista(d.verificar)}
        <h3>Acciones</h3>${lista(d.acciones)}
        ${d.noHagas?.length ? `<h3>No hagas</h3>${lista(d.noHagas)}` : ""}
        ${
          d.escalar
            ? `<div class="arbol-aviso corregir"><b>Escalar:</b> ${escapar(d.escalar)}</div>`
            : ""
        }
        ${chips(d.danos, "Daños posibles")}
        ${chips(d.provieneDe, "Puede venir de")}
        ${chips(d.llevaA, "Puede llevar a")}
        ${
          d.glosario?.length
            ? `<h3>Términos</h3>${d.glosario
                .map((k) => {
                  const t = glosario[k];
                  return `<button class="arbol-chip" data-termino="${k}" title="${escapar(
                    t?.definicion ?? ""
                  )}">${escapar(t?.titulo ?? k)}</button>`;
                })
                .join("")}`
            : ""
        }`;
    }

    panel.querySelectorAll("[data-ir]").forEach((b) =>
      b.addEventListener("click", () => seleccionar(b.dataset.ir))
    );
    panel.querySelectorAll("[data-termino]").forEach((b) =>
      b.addEventListener("click", () => {
        const t = glosario[b.dataset.termino];
        if (!t) return;
        panel.innerHTML = `
          <span class="meta">glosario</span>
          <h2>${escapar(t.titulo)}</h2>
          <p>${escapar(t.definicion)}</p>
          ${t.enCampo ? `<h3>En campo</h3><p>${escapar(t.enCampo)}</p>` : ""}
          ${t.nota ? `<h3>Nota</h3><p>${escapar(t.nota)}</p>` : ""}
          ${chips(t.eventos, "Se ve en")}`;
        panel.querySelectorAll("[data-ir]").forEach((x) =>
          x.addEventListener("click", () => seleccionar(x.dataset.ir))
        );
      })
    );
  }

  pintarAyuda();
  requestAnimationFrame(ajustar);

  const alRedimensionar = () => ajustar();
  window.addEventListener("resize", alRedimensionar);

  return {
    grafo,
    seleccionar,
    limpiar,
    ajustar,
    get seleccionado() {
      return seleccionado;
    },
    destruir() {
      window.removeEventListener("resize", alRedimensionar);
      contenedor.innerHTML = "";
    },
  };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function crear(etiqueta, clase) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  return el;
}

function escapar(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/** Inyecta el CSS del árbol una sola vez. */
export function inyectarEstilos(documento = document) {
  if (documento.getElementById("arbol-eventos-css")) return;
  const s = documento.createElement("style");
  s.id = "arbol-eventos-css";
  s.textContent = CSS_ARBOL;
  documento.head.appendChild(s);
}
