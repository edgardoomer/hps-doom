# HPS-DOOM

Curvas de eficiencia, punto de operación y diagnóstico de bombas horizontales
de superficie (HPS) de reinyección y transferencia de agua.

La aplicación reconstruye la curva de fábrica de cada unidad a cualquier
frecuencia, sitúa sobre ella el punto de operación que se le indique y dice si
ese punto es admisible: contra la curva de la bomba y contra los límites que
fija la operación.

Versión actual: **v0.3**

## ¿Qué resuelve?

En campo la pregunta no es cómo es la curva, sino si el punto al que está
trabajando la unidad se sostiene. Las fichas del fabricante traen una familia de
curvas por frecuencia en PDF, y contrastarlas a mano con la lectura del variador
es lento y poco fiable.

Aquí se introduce caudal, presión de succión y frecuencia, y la aplicación
devuelve head, eficiencia, potencia al eje, NPSHr y la posición relativa al BEP,
con el veredicto y el motivo.

## Las pestañas

| Pestaña | Qué hace |
| --- | --- |
| **Curvas de eficiencia** | Curva de la unidad a la frecuencia elegida, punto de operación sobre ella y evaluación contra curva y contra límites operacionales. |
| **Arranques** | Datos de locación y resumen de arranque de cada unidad. |
| **Documentación** | Fichas técnicas con su curva de fábrica e instructivos de la intranet. |
| **Créditos** | Autor, tecnologías y fuentes de datos. |

Un asistente de diagnóstico acompaña a todas las pestañas: redacta el análisis
del punto de operación y responde consultas sobre lo que hay en pantalla.

## El inventario

14 unidades, **HPS-02 a HPS-15**, sobre cuatro hidráulicas Baker Hughes HPump.
HPS-07, HPS-08 y HPS-09 son de transferencia; el resto, de reinyección de agua.

| Hidráulica | Serie | Etapas | Q<sub>BEP</sub> a 60 Hz | η<sub>BEP</sub> | MCSF a 60 Hz | Unidades |
| --- | --- | --- | --- | --- | --- | --- |
| TJ12000 | TJ | 64 | 12 745 BPD | 79,73 % | 5 304 BPD | HPS-02, 04, 05, 06, 10, 11, 12, 13, 14, 15 |
| HC12500 | HC | 61 | 12 625 BPD | 77,28 % | 4 208 BPD | HPS-03 |
| HC27000 | 675HC | 26 | 27 506 BPD | 72,55 % | 20 402 BPD | HPS-07 |
| HC20000 | 675HC | 19 y 23 | — | — | — | HPS-08, HPS-09 |

Las fichas de HPS-08 y HPS-09 son reportes AutographPC: sólo traen la familia de
curvas de head, sin BEP ni curva de eficiencia. Para esas dos unidades la
aplicación oculta eficiencia y potencia en lugar de trasladar datos de otra
ficha, que sería inventarlos. HPS-02 y HPS-13 comparten la bomba TJ12000 de
64 etapas pero no tienen condición de operación propia en la ficha: se muestra
la curva de fábrica y el punto de diseño queda pendiente de documentar.

## El modelo

Cada curva se almacena **una sola vez, a 60 Hz (3 570 rpm nominal)**. Las
familias multi-velocidad de los documentos originales son escalados exactos de
esa curva base por leyes de afinidad, así que cualquier frecuencia se genera bajo
demanda:

```
Q ∝ N        H ∝ N²        P ∝ N³        η ≈ constante a Q/N igual
```

Al contrastar las curvas trazadas de 30 a 65 Hz contra la predicción de afinidad
el error máximo fue de 4 psi, dentro del ruido de digitalización.

La forma de la curva de eficiencia es `η/η_bep = 1 − K·(1 − Q/Q_bep)²`, con
`K = 0,84873` ajustado por mínimos cuadrados sobre las ocho condiciones
documentadas de la TJ12000 64 stg (rms 0,004 puntos).

El modelo se contrastó punto por punto contra las fichas de fábrica:

| Magnitud | Error frente a la ficha |
| --- | --- |
| Head en el punto *rated* | < 1,3 psi (0,05 %) |
| Eficiencia en *rated* | < 0,02 puntos |
| Potencia hidráulica | < 0,5 hp |
| Potencia al eje | < 0,4 hp |
| Presión máxima de trabajo | exacta |

## Límites operacionales

A diferencia de los datos de fábrica, estos valores los fija la operación
(seteo de válvulas, protecciones del variador, criterios de mantenimiento) y se
editan en `src/data/operational.data.ts`:

| Límite | Valor |
| --- | --- |
| Presión de descarga máxima / mínima | 2 700 / 1 000 psi |
| Presión de succión máxima / mínima | 150 / 40 psi |
| Caudal máximo | 12 000 BPD |
| Temperatura de cámara de empuje | 90 °C |
| Vibración máxima | 12 mm/s |
| Presión de aceite del cooler | 80 psi |

El techo de frecuencia es 60 Hz: ninguna unidad trabaja por encima.

## El asistente

El análisis inicial del punto de operación **siempre se redacta en local**, con
los diccionarios de `src/lib/knowledge/` (evaluación, eventos y glosario). El
modelo remoto sólo interviene en las consultas del chat.

El proveedor es **DeepSeek**, que expone una API compatible con la de OpenAI, así
que se consume con el SDK oficial `openai` apuntando su `baseURL`. Cambiar de
proveedor es cuestión de tocar `DEEPSEEK_BASE_URL` y `DEEPSEEK_MODEL` en el
`.env`. Sin clave la aplicación sigue funcionando: el análisis local se sigue
redactando y el chat avisa de que falta la clave.

La clave la lee sólo el servidor, desde una *server function* de TanStack Start;
por eso **no** lleva el prefijo `VITE_`, que la incrustaría en el bundle del
navegador.

## Puesta en marcha

Requiere **Node 24 / npm 11 o superior**. Con el npm 10 que acompaña a Node 22
este árbol de dependencias no instala (conflicto de peers ajv 6/8).

```sh
cd codigo_lovable
cp .env.example .env        # y pon DEEPSEEK_API_KEY si quieres el chat
npm install
npm run dev
```

Otros comandos: `npm run build`, `npm run preview`, `npm run lint`,
`npm run format`.

## Estructura

```
.
├── codigo_lovable/      # La aplicación
│   ├── src/
│   │   ├── routes/      # curvas, arranques, documentacion, creditos
│   │   ├── components/  # gráfico de curva, menú de bombas, chat, UI
│   │   ├── data/        # curvas, bombas, límites operacionales, documentos
│   │   ├── lib/         # pumpPhysics, knowledge/, ai/, formato
│   │   └── services/    # evaluación del punto y llamada al modelo
│   └── public/curvas/   # imágenes de las curvas de fábrica
├── netlify.toml         # despliegue en Netlify
└── DESPLIEGUE.md        # despliegue en una VM de Google Cloud
```

El material de origen (`varios/`, `curvas_img/`, `contexto/`) no se versiona: las
curvas y fichas ya están digitalizadas en `src/data/` y los diccionarios en
`src/lib/knowledge/`.

## Despliegue

- **Netlify** — configurado en `netlify.toml`: `base` en `codigo_lovable`,
  preset `netlify` de Nitro, Node 24. La clave del asistente va en *Site
  configuration → Environment variables*, no en el repositorio.
- **VM de Google Cloud** — guía completa en [DESPLIEGUE.md](DESPLIEGUE.md)
  (Debian/Ubuntu + Node 24 + Nitro `node-server` + Nginx + HTTPS con Let's
  Encrypt). El paso que no se puede saltar es construir con
  `NITRO_PRESET=node-server`: el build por defecto genera un bundle para
  Cloudflare Workers, no para Node.

La aplicación no usa base de datos: los datos de bombas y curvas viven en el
código.

## Stack

TanStack Start · React 19 · TypeScript · Tailwind CSS 4 · Radix UI (shadcn) ·
Recharts · Vite 8 · Nitro · SDK `openai` contra DeepSeek.

## Fuentes de datos

- *Multiple Conditions Datasheet* — Curva TJ12000 64 STG (cotización 2414687,
  Baker Hughes HPump 26.0.0).
- Curvas HC12500 61 STG y HC27000 26 STG.
- Reportes AutographPC para HC20000 a 19 y 23 etapas.
- Límites operacionales, instructivos y procedimientos: operación real. Los PDF
  completos viven en el SharePoint corporativo y requieren sesión.

## Desarrollo

Autor: **Ing. Edgar Izurieta**. La digitalización de las curvas, la validación
del modelo físico contra las fichas de fábrica, los límites operacionales y los
criterios de diagnóstico son propios.

El andamiaje inicial de la interfaz se generó con [Lovable](https://lovable.dev)
—de ahí el nombre de la carpeta `codigo_lovable`— y la implementación posterior
se hizo con asistencia de **Claude (Anthropic)** como herramienta de apoyo en la
escritura y revisión del código. La responsabilidad sobre el contenido técnico y
los resultados es del autor.

## Créditos

**Ing. Edgar Izurieta** — Ingeniero en Petróleos | Especialista en Datos e
Inteligencia Artificial

- LinkedIn: <https://www.linkedin.com/in/edgarfer/>
- Instagram: <https://www.instagram.com/doom.petrolero>
- Sitio web: <https://edgarpetrolero.duckdns.org/>
- GitHub: <https://github.com/edgardoomer>
