# Diccionarios de contexto HPS-DOOM

Tu `diccionarioevaluacion.js` original se dividió en tres diccionarios, cada uno
con un trabajo distinto, más el árbol de sucesos que pediste.

```
glosario.js            52 términos. El vocabulario que hay que entender antes de
                       leer cualquier otra cosa.
evaluacion.js          17 consideraciones (las 11 tuyas + 6 nuevas). Reglas de la
                       pestaña "Curvas de eficiencia", ahora con empuje axial y
                       daños en cada una.
eventos.js             28 eventos de campo + 18 daños + el árbol causa-efecto.
                       Es tu lista de diagnóstico, ordenada y corregida.

arbolEventos.js        Dibuja el árbol. Sin dependencias.
generarArbolHtml.mjs   Regenera el HTML autocontenido.
arbolEventos.html      Ábrelo con doble clic. No necesita servidor.

index.js               Reexporta todo y arma el contexto para el modelo.
diccionarioevaluacion.js   Compatibilidad: los imports que ya tenías siguen
                       funcionando sin tocar nada.
```

## Por qué tres archivos y no uno

Cuando se le inyecta contexto a un modelo, lo que importa es poder darle sólo lo
pertinente. Con un archivo único había que pasar el diccionario entero. Ahora:

```js
import { contextoDeUnaEvaluacion } from "./index.js";

// ~100 líneas: sólo las consideraciones que se dispararon, sus términos,
// el régimen de empuje y los daños esperados.
const sistema = contextoDeUnaEvaluacion(resultadoDeLaEvaluacion);
```

Y si quieres todo (unas 620 líneas), `contextoCompletoParaPrompt()`.

## Upthrust y downthrust

Es el hilo que cose los tres archivos. La regla, en una línea:

- **Downthrust** — poco caudal, mucha presión. A la izquierda del BEP. Es la
  condición normal de diseño; el problema es el exceso. Avisa antes de romper:
  primero sube la temperatura y cae el caudal.
- **Upthrust** — mucho caudal, poca presión. A la derecha del BEP, hacia runout.
  Los impulsores se levantan de su apoyo y repiquetean. Rompe en horas, y de ahí
  sale la mayoría de los ejes partidos.

Cada consideración y cada evento llevan un campo `empujeAxial` con `tipo`,
`severidad` y `porQue`. Además:

```js
import { empujeAxialDelPunto, explicarEmpuje } from "./evaluacion.js";

empujeAxialDelPunto(148);  // → { titulo: "Upthrust severo", danos: [...] }
explicarEmpuje(148);       // → frase lista para mostrarle al operador
```

Los seis regímenes están en `REGIMENES_EMPUJE`, por tramos de porcentaje del BEP.

**Una corrección de fondo:** en tu borrador, el caso "no tienes caudal y buena
presión" apuntaba a upthrust. Es al revés: caudal cero con presión máxima es
**downthrust severo**, el extremo izquierdo de la curva. El upthrust es la
situación contraria. Está corregido y explicado en `EV-05.correccion` y en la
consideración `sinCaudalConHead`, porque es una confusión que vale la pena dejar
escrita.

## Lo que cambió en las consideraciones

Las 11 originales conservan su `id`, su `condicion`, su `estado` y su `mensaje`,
así que `operationService.ts` y los regex de `POR_MENSAJE` siguen funcionando.
Lo que se les añadió:

- `empujeAxial` — qué empuje impone ese punto y por qué.
- `danos` — IDs del catálogo de `eventos.js`.
- `eventos` — qué vería el operador en locación con ese mismo punto.
- `glosario` — los términos necesarios para leerla.
- Más causas y más acciones en las que se quedaban cortas.

Las 6 nuevas llevan `pendienteDeImplementar: true`: están escritas y sirven de
contexto para el modelo, pero el servicio todavía no las dispara. Son
`sinCaudalConHead`, `caidaProgresivaDeHead`, `presionSuccionBaja`,
`presionSuccionAlta`, `potenciaSobreNominal` y `presionDescargaSobreVrp`.
Sus umbrales están aparte, en `UMBRALES_PROPUESTOS`, para no mezclarlos con los
que sí tienen que coincidir con el servicio.

## El árbol de sucesos

`arbolEventos.html` se abre con doble clic. Seis columnas, de la causa raíz al
daño en la bomba:

```
Causa raíz → Primer síntoma → Se propaga → Consecuencia → Falla → Daño
```

- Clic en un nodo: en **verde** todo lo que pudo causarlo, en **rojo** todo lo
  que puede desencadenar. El énfasis baja con la distancia, porque el grafo es
  tupido y resaltar la cadena entera no diría nada.
- La flecha de cada nodo indica el empuje: ↑ upthrust, ↓ downthrust, ↕ variable.
- Línea continua: lleva a. Punteada corta: daño que produce. Punteada larga por
  debajo: realimentación, el efecto que vuelve sobre su causa. Hay ciclos reales
  ahí — cavitación → desgaste → menos presión → más caudal → más cavitación — y
  se dibujan en lugar de esconderse.
- Filtros por familia, buscador, rueda para acercar, arrastrar para mover.

Dentro de la app no hace falta el HTML:

```js
import { EVENTOS, DANOS, FAMILIAS } from "./eventos.js";
import { GLOSARIO } from "./glosario.js";
import { construirGrafo, dibujarArbol, inyectarEstilos } from "./arbolEventos.js";

inyectarEstilos();
const grafo = construirGrafo({ eventos: EVENTOS, danos: DANOS });
dibujarArbol(document.querySelector("#arbol"), grafo, {
  familias: { ...FAMILIAS, dano: { titulo: "Daños", color: "#64748b" } },
  glosario: GLOSARIO,
  alSeleccionar: (nodo) => console.log(nodo.id),
});
```

Si editas `eventos.js`, regenera el HTML con `node generarArbolHtml.mjs`. El
generador se niega a escribir si el árbol tiene aristas descuadradas.

## Triage rápido

`MATRIZ_SINTOMAS` es el atajo de radio: le pasas lo que ves y te dice qué mirar.

```js
import { buscarPorSintomas } from "./eventos.js";

buscarPorSintomas({ descarga: "baja", caudal: "alta" });
// → EV-03, upthrust: "Te quedaste sin contrapresión. Es la condición más
//   urgente de todas."
```

Valores admitidos: `"alta" | "normal" | "baja" | "nula"`.

## Verificación

```js
import { verificarTodo } from "./index.js";
verificarTodo(); // [] si todos los IDs cruzados existen y el árbol es simétrico
```

Comprueba que cada `llevaA` tenga su `provieneDe`, que los IDs de daños, eventos
y términos existan, y que ninguna consideración se haya quedado sin
`empujeAxial`. Vale la pena dejarlo en un test.
