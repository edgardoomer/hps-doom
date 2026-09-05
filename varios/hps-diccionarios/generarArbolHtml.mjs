/**
 * Genera arbolEventos.html: un archivo autocontenido que se abre con doble
 * clic, sin servidor y sin dependencias.
 *
 *   node generarArbolHtml.mjs
 *
 * Vuelve a ejecutarlo cada vez que edites eventos.js o glosario.js.
 * Dentro de la app (Vite) no hace falta: ahí se importan los módulos
 * directamente y se llama a construirGrafo() + dibujarArbol().
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { EVENTOS, DANOS, FAMILIAS, verificarIntegridad } from "./eventos.js";
import { GLOSARIO } from "./glosario.js";

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = join(aqui, "arbolEventos.html");

const problemas = verificarIntegridad();
if (problemas.length) {
  console.error("El árbol no es coherente. Corrige esto antes de generar:");
  for (const p of problemas) console.error("  -", p);
  process.exit(1);
}

// Se inlinea el módulo del árbol quitándole los `export`, para que el HTML
// funcione con file:// sin necesidad de servir los archivos.
const fuenteArbol = (await readFile(join(aqui, "arbolEventos.js"), "utf8"))
  .replace(/^export (const|function) /gm, "$1 ")
  .replace(/^export \{[^}]*\};?$/gm, "");

const datos = JSON.stringify({ EVENTOS, DANOS, FAMILIAS, GLOSARIO });

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Árbol de sucesos — HPS</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: #f6f7f9; color: #1b1f24; display: flex; flex-direction: column; }
  @media (prefers-color-scheme: dark) { body { background: #12161b; color: #e6eaef; } }
  header { padding: 14px 20px; border-bottom: 1px solid #dfe3e8; flex: 0 0 auto; }
  @media (prefers-color-scheme: dark) { header { border-color: #2c3540; } }
  h1 { margin: 0; font-size: 15px; font-weight: 600; }
  header p { margin: 3px 0 0; font-size: 12.5px; color: #5c6672; }
  @media (prefers-color-scheme: dark) { header p { color: #9aa6b4; } }
  #arbol { flex: 1 1 auto; min-height: 0; }
</style>
</head>
<body>
<header>
  <h1>Árbol de sucesos — sistema de bombeo horizontal</h1>
  <p>Clic en un nodo para ver su cadena de causas y efectos. Rueda para acercar, arrastra para mover.</p>
</header>
<div id="arbol"></div>

<script type="application/json" id="datos-hps">${datos.replace(/</g, "\\u003c")}</script>
<script type="module">
${fuenteArbol}

const { EVENTOS, DANOS, FAMILIAS, GLOSARIO } =
  JSON.parse(document.getElementById("datos-hps").textContent);

inyectarEstilos();
const grafo = construirGrafo({ eventos: EVENTOS, danos: DANOS });
const api = dibujarArbol(document.getElementById("arbol"), grafo, {
  familias: { ...FAMILIAS, dano: { titulo: "Daños", color: "#64748b" } },
  glosario: GLOSARIO,
});
window.arbolHPS = api;
</script>
</body>
</html>
`;

await writeFile(salida, html, "utf8");
console.log(
  `arbolEventos.html generado — ${Object.keys(EVENTOS).length} eventos, ` +
    `${Object.keys(DANOS).length} daños, ${(html.length / 1024).toFixed(0)} KB`
);
