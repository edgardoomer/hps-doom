# PROMPT PARA LOVABLE — HPS-DOOM · VARIANTE B (layout exacto del boceto)

> Pega todo este documento como primer mensaje en un proyecto nuevo de Lovable.
> El chat de IA vive **dentro de cada pestaña**, tal como está dibujado en los bocetos.

---

## 0. QUÉ VAMOS A CONSTRUIR

Construye **HPS-DOOM**, una aplicación web de escritorio (single-page) para monitoreo y análisis
de bombas horizontales de superficie (HPS) en campo petrolero.

Esta primera entrega es **solo interfaz**: maquetado, navegación, estados y datos simulados.
No implementes lógica de negocio real, ni cálculos hidráulicos, ni llamadas a servicios externos.
Toda la data viene de mocks tipados que después se reemplazan por un backend real.

**Idioma de toda la interfaz: español.** Respeta mayúsculas, tildes y unidades exactamente
como aparecen en este documento.

---

## 1. STACK Y RESTRICCIONES

- React + TypeScript + Vite + Tailwind CSS + shadcn/ui + lucide-react (stack por defecto de Lovable).
- **Gráficos: Recharts.** No uses otra librería de charts.
- Sin autenticación, sin base de datos, sin backend, sin Supabase en esta entrega.
- Sin librerías de estado externas (Redux/Zustand). Usa React Context + hooks.
- Todo el estado de sesión vive en memoria: **al recargar o cerrar la pestaña se pierde**.
  Única excepción permitida en `localStorage`: la preferencia de tema claro/oscuro.

---

## 2. REGLAS DE CONTENIDO (IMPORTANTE)

La interfaz debe ser **limpia, densa y funcional**. Específicamente:

- **NO** muestres fórmulas, ecuaciones, ni notación matemática en ninguna parte.
- **NO** escribas párrafos explicativos, textos de ayuda, onboarding, tooltips educativos,
  "cómo funciona", ni descripciones de marketing.
- **NO** inventes secciones que no estén pedidas aquí.
- Etiqueta + valor. Nada más. Los textos largos solo existen dentro del chat de IA.
- Los números se muestran con `font-variant-numeric: tabular-nums` para que alineen en columna.

---

## 3. SISTEMA DE DISEÑO — TEMA DUAL (claro + oscuro)

Implementa **ambos temas** con un toggle (icono sol/luna) en la esquina superior derecha del header.
Por defecto sigue la preferencia del sistema operativo. El toggle debe ganar sobre la preferencia del SO.
Define todo como CSS custom properties / tokens de Tailwind; nunca hex sueltos en los componentes.

### Superficies e ink

| Rol | Claro | Oscuro |
|---|---|---|
| Plano de página (fondo app) | `#f9f9f7` | `#0d0d0d` |
| Superficie de tarjeta/panel | `#fcfcfb` | `#1a1a19` |
| Texto primario | `#0b0b0b` | `#ffffff` |
| Texto secundario | `#52514e` | `#c3c2b7` |
| Texto atenuado (labels, ejes) | `#898781` | `#898781` |
| Línea de grilla (hairline) | `#e1e0d9` | `#2c2c2a` |
| Eje / línea base | `#c3c2b7` | `#383835` |
| Borde de tarjeta | `rgba(11,11,11,0.10)` | `rgba(255,255,255,0.10)` |

### Acento (color de la pestaña activa, celeste del boceto)

- Claro: `#1E9BD7` · Oscuro: `#3FBBF0`
- Texto sobre el acento: blanco en ambos modos.
- El acento **solo** se usa para: item activo del sidebar, foco de inputs, botón primario.
  Nunca para series de datos.

### Paleta de series del gráfico (ya validada — úsala tal cual)

Las curvas de la bomba son una **rampa ordenada de un solo tono azul** (curva más baja = más clara).
5 pasos, en este orden:

- Claro: `#86b6ef`, `#5598e7`, `#2a78d6`, `#1c5cab`, `#104281`
- Oscuro: `#cde2fb`, `#86b6ef`, `#3987e5`, `#256abf`, `#184f95`

El **punto/línea de operación actual** usa naranja para no confundirse jamás con las curvas:

- Claro: `#eb6834` · Oscuro: `#d95926`

### Colores de estado (fijos, no cambian entre temas)

| Estado | Hex |
|---|---|
| Correcto / dentro de curva | `#0ca30c` |
| Advertencia / al límite | `#fab219` |
| Crítico / fuera de curva | `#d03b3b` |

**Regla dura:** un estado nunca se comunica solo con color. Siempre color **+ icono + etiqueta de texto**.

### Tipografía y forma

- Tipografía: `system-ui, -apple-system, "Segoe UI", sans-serif`. Una sola familia en toda la app.
- Radio de esquina: 8px en tarjetas, 6px en inputs y botones, 4px en chips.
- Bordes: hairline de 1px. Sin sombras pesadas; máximo una sombra sutil en popovers.
- Los títulos de cada recuadro van arriba a la izquierda, en mayúsculas, 11px, letter-spacing 0.06em,
  color de texto atenuado.
- Densidad compacta: la app entra completa en un monitor 1440×900 sin scroll vertical en las
  pestañas de Curvas y Arranques.

---

## 4. ARQUITECTURA Y CONTRATOS DE DATOS (crítico — el backend se conecta después)

Toda la data debe entrar por una capa de servicios, **nunca** hardcodeada dentro de un componente.

```
src/
  types/
    pump.ts            // Pump, PumpCurve, CurvePoint
    operation.ts       // OperatingInput, OperatingEvaluation, LocationInput
    chat.ts            // ChatMessage, ChatRole, AnalysisRequest
  data/
    pumps.mock.ts      // 4 bombas mock (HPS-12, HPS-15, HPS-16, HPS-17)
    curves.mock.ts     // curvas simuladas por bomba
    docs.mock.ts       // documentos de la pestaña Documentación
  services/
    pumpService.ts     // getPumps(), getPumpById(id), getPumpCurves(id)
    operationService.ts// evaluateOperatingPoint(pumpId, input)
    chatService.ts     // sendMessage(ctx, text), runInitialAnalysis(ctx)
  lib/
    knowledge/
      technicalDictionary.ts  // placeholder, ver abajo
    format.ts          // formateo de números y unidades
  context/
    PumpContext.tsx    // bomba seleccionada, compartida entre TODAS las pestañas
    SessionContext.tsx // inputs y chats de la sesión, se vacían al recargar
  components/
  pages/
```

### Reglas de la capa de servicios

- Cada función de `services/` es `async`, devuelve una `Promise` tipada y simula 400–800 ms de latencia.
- En la cabecera de cada servicio deja el comentario:
  `// TODO(backend): reemplazar mock por fetch a la API real. Mantener firma y tipos.`
- Ninguna función de servicio recibe ni devuelve `any`.
- Los componentes solo consumen hooks (`usePumps`, `usePumpCurves`, `useChat`) que envuelven los servicios.

### Tipos que debes crear (respeta los nombres de campo)

```ts
export interface Pump {
  id: string;                       // "hps-12"
  nombre: string;                   // "HPS-12"
  presionMaximaTrabajo: number;     // psi.g
  presionPruebaHidrostatica: number;// psi.g
  potenciaHidraulica: number;       // hp
  potenciaNominal: number;          // hp (al punto de operación)
  potenciaMaximaDiametroNominal: number; // hp
  motorMinimoRecomendado: { hp: number; kw: number };
  caudalNominal: number;            // USbl/día
  headDiferencialRequerido: number; // psi
  headDiferencialReal: number;      // psi
  presionDescargaReal: number;      // psi
  presionSuccion: { nominal: number; maxima: number }; // psi.g
  modeloBomba: string;              // "TJ12000"
  etapas: number;                   // 64
}

export interface CurvePoint { caudal: number; head: number; eficiencia: number; potencia: number; }
export interface PumpCurve { frecuenciaHz: number; puntos: CurvePoint[]; }

export interface OperatingInput {
  presionSuccion: number | null;
  presionDescarga: number | null;
  caudal: number | null;
  frecuencia: number | null;
}

export interface OperatingEvaluation {
  estado: 'dentro' | 'limite' | 'fuera' | 'sin-datos';
  etiqueta: string;                 // texto corto mostrado junto al icono
  headCalculado: number | null;     // solo para posicionar el marcador, no lo expliques en UI
}

export interface LocationInput {
  presionSuccion: number | null;
  presionARomper: number | null;
  caudalEsperado: number | null;
}

export type ChatRole = 'user' | 'assistant' | 'system';
export interface ChatMessage { id: string; role: ChatRole; contenido: string; timestamp: number; }
```

### Diccionario técnico (placeholder para la IA)

Crea `src/lib/knowledge/technicalDictionary.ts` exportando un objeto vacío pero tipado, con este
comentario arriba:

```ts
// TODO(backend): este diccionario alimentará al LLM con consideraciones técnicas
// (límites operativos, modos de falla, recomendaciones de arranque) por modelo de bomba.
// Se poblará más adelante. No lo uses todavía para renderizar nada en la UI.
export interface TechnicalNote { clave: string; titulo: string; contenido: string; tags: string[]; }
export const technicalDictionary: Record<string, TechnicalNote[]> = {};
```

### Datos mock de las 4 bombas

Crea `HPS-12`, `HPS-15`, `HPS-16` y `HPS-17`. **HPS-12 lleva exactamente estos valores**
(son los del boceto); para las otras tres varía los números un ±5–15 % de forma plausible y cambia
`modeloBomba` y `etapas`:

```
Presión máxima de trabajo: 3,205.7 psi.g
Presión de prueba hidrostática: 4,808.6 psi.g
Potencia hidráulica: 517 hp
Potencia nominal (al punto de operación): 651 hp
Potencia máxima a diámetro nominal: 775 hp
Motor mínimo recomendado: 800 hp / 597 kW
Caudal nominal: 11,772.0 USbl/día
Head diferencial requerido: 2,503.0 psi
Head diferencial real: 2,504.9 psi
Presión de descarga (real): 2,642.9 psi
Presión de succión (nominal / máx): 138.0 / 138.0 psi.g
Modelo de bomba: TJ12000
Etapas: 64
```

Para las curvas mock genera 5 frecuencias (**45, 50, 55, 60, 65 Hz**), cada una con ~25 puntos,
head decreciente conforme sube el caudal, con forma de curva de bomba centrífuga.

---

## 5. LAYOUT GLOBAL

Dos zonas fijas, sin scroll de página:

### 5.1 Sidebar vertical izquierdo

- Ancho fijo ~200px, altura completa, borde hairline a la derecha.
- Cuatro items apilados verticalmente, cada uno en su propia celda alta (~110px) separada por
  líneas hairline horizontales, texto centrado. Este bloque ocupado va arriba; el espacio sobrante
  queda vacío abajo.

  1. **Curvas de eficiencia**
  2. **Arranques**
  3. **Documentación**
  4. **Créditos**

- El item activo se pinta con el **fondo acento celeste completo** y texto blanco (así está en el boceto).
- Los inactivos: fondo de superficie, texto secundario, hover con un lavado sutil.
- Al pie del sidebar, discreto: `HPS-DOOM v0.1`.

### 5.2 Área de contenido

- Ocupa el resto del ancho, con un marco hairline y padding de 20px.
- Header superior del área de contenido: título **HPS-DOOM** centrado, en mayúsculas, peso medio.
  A la derecha del header: chip con la bomba seleccionada + toggle de tema.
- El contenido cambia según la pestaña. La navegación es client-side (react-router) con rutas
  `/curvas`, `/arranques`, `/documentacion`, `/creditos`. Ruta por defecto: `/curvas`.

---

## 6. MENÚ RETRÁCTIL DE BOMBAS (componente compartido)

- Panel angosto anclado arriba a la izquierda del área de contenido, dentro de la pestaña
  Curvas de eficiencia y también dentro del recuadro de datos de bomba en la pestaña Arranques.
- Contiene 4 chips apilados verticalmente: `HPS-12`, `HPS-15`, `HPS-16`, `HPS-17`.
- Chips compactos, gris neutro, esquinas 4px, ~28px de alto, texto 12px.
- El chip seleccionado se marca con el acento celeste (borde izquierdo de 3px + texto acentuado).
- **Retráctil:** un botón con icono chevron colapsa el panel a una sola pastilla que muestra la
  bomba activa; al expandir vuelven a verse los 4. Animación de 150 ms.
- La selección vive en `PumpContext` y es **global**: cambiar de bomba en una pestaña la cambia en todas.
- Cambiar de bomba recarga los datos y las curvas, y **limpia el resultado de evaluación**, pero
  no borra el historial del chat.

---

## 7. PESTAÑA "CURVAS DE EFICIENCIA"

Grilla de la zona de contenido:

```
┌──────────────────────────────────────────────────────────────┐
│  [menú retráctil]              HPS-DOOM                      │
├──────────────────────────────────────────────────────────────┤
│  DATOS DE BOMBA  (ancho completo, 2 columnas)                │
├───────────────────────────┬──────────────────────────────────┤
│                           │  INPUT DE OPERACIÓN ACTUAL       │
│         GRÁFICO           ├──────────────────────────────────┤
│                           │  CHAT IA                         │
└───────────────────────────┴──────────────────────────────────┘
```

Fila inferior: 55 % gráfico / 45 % columna derecha. La columna derecha se divide en input (arriba,
altura automática) y chat (abajo, ocupa el resto).

### 7.1 Recuadro DATOS DE BOMBA

- Ancho completo, altura compacta.
- Muestra los 13 campos de la bomba seleccionada, en **dos columnas de texto**, con este orden exacto:

  **Columna izquierda**
  - Presión máxima de trabajo: `3,205.7 psi.g`
  - Presión de prueba hidrostática: `4,808.6 psi.g`
  - Potencia hidráulica: `517 hp`
  - Potencia nominal (al punto de operación): `651 hp`
  - Potencia máxima a diámetro nominal: `775 hp`
  - Motor mínimo recomendado: `800 hp / 597 kW`

  **Columna derecha**
  - Caudal nominal: `11,772.0 USbl/día`
  - Head diferencial requerido: `2,503.0 psi`
  - Head diferencial real: `2,504.9 psi`
  - Presión de descarga (real): `2,642.9 psi`
  - Presión de succión (nominal / máx): `138.0 / 138.0 psi.g`
  - Modelo de bomba: `TJ12000`
  - Etapas: `64`

- Formato: etiqueta en texto secundario, valor en texto primario con tabular-nums. 12px, interlineado ajustado.
- Los valores cambian al cambiar de bomba, con un skeleton shimmer mientras "cargan".

### 7.2 Recuadro GRÁFICO

- Recharts, `ResponsiveContainer`, ocupa todo el recuadro.
- Eje X: **Caudal (USbl/día)**. Eje Y: **Head diferencial (psi)**. **Un solo eje Y — nunca dos escalas.**
- Una línea por frecuencia (45/50/55/60/65 Hz), con la rampa azul ordenada de la sección 3.
- Grosor de línea 2px, sin puntos en la curva, `strokeLinecap: round`.
- Grilla horizontal hairline únicamente; sin grilla vertical. Ejes y ticks en color atenuado, 11px.
- **Leyenda siempre visible** (las 5 frecuencias), horizontal, arriba a la derecha del gráfico, 11px.
- **Tooltip con crosshair** al pasar el mouse: muestra caudal, head y la frecuencia de la serie más cercana.
- **Marcador de operación actual:** cuando el usuario confirma los datos del recuadro 7.3, dibuja
  en el gráfico:
  - una línea vertical punteada en el caudal ingresado,
  - una línea horizontal punteada en el head resultante,
  - un punto de 10px en la intersección, en color naranja, con un anillo de 2px del color de la
    superficie para que se despegue de las curvas,
  - una etiqueta directa junto al punto: `OPERACIÓN ACTUAL`.
- Si no hay datos ingresados, el gráfico se ve normal y no aparece marcador.
- Botón discreto arriba a la derecha del recuadro: **"Ver tabla"**, que abre un modal con los puntos
  de la curva en tabla (accesibilidad, no lo adornes).

### 7.3 Recuadro INPUT DE OPERACIÓN ACTUAL

Cuatro campos numéricos, uno por fila, etiqueta a la izquierda e input a la derecha:

- `PRESIÓN DE SUCCIÓN` — sufijo `psi.g`
- `PRESIÓN DE DESCARGA` — sufijo `psi.g`
- `CAUDAL` — sufijo `USbl/día`
- `FRECUENCIA` — sufijo `Hz`

A la derecha del bloque, alineado verticalmente, el indicador **¿DENTRO DE LA CURVA?**:

- Estado inicial: `— SIN DATOS`, en texto atenuado, sin color.
- Tras evaluar, una de tres respuestas, siempre con **icono + texto + color**:
  - `● DENTRO DE CURVA` — verde `#0ca30c`, icono check-circle
  - `● EN EL LÍMITE` — ámbar `#fab219`, icono alert-triangle
  - `● FUERA DE CURVA` — rojo `#d03b3b`, icono x-circle
- Debajo del indicador, un botón primario **"EVALUAR"**, deshabilitado hasta que los 4 campos tengan valor.
- Junto a él, un botón secundario **"LIMPIAR"** que vacía los campos, borra el marcador del gráfico
  y devuelve el indicador a `SIN DATOS`.
- Validación: solo números, permite decimales, marca en rojo el campo si el valor es negativo.
  No muestres textos de error largos, solo el borde rojo y un `!` pequeño.
- `evaluateOperatingPoint` es un stub: devuelve un estado simulado según si el caudal ingresado cae
  dentro del rango de caudales de la curva de la frecuencia más cercana. **No implementes hidráulica real.**

### 7.4 Recuadro CHAT IA

Usa el componente `<ChatIA />` de la sección 11, con estas particularidades:

- **Estado vacío** (antes de evaluar): un botón primario grande al centro,
  **"INICIAR ANÁLISIS"**, deshabilitado mientras no se hayan evaluado los datos de operación.
  Debajo, en texto atenuado y una sola línea: `Ingresa los datos de operación para habilitar el análisis.`
- Al pulsarlo, el asistente responde (mock, con efecto de escritura progresiva) con un mensaje
  estructurado en tres bloques cortos, con estos encabezados literales:
  - `RECOMENDACIONES INICIALES`
  - `POSIBLES DAÑOS`
  - `ESTADO DE OPERACIÓN`
- A partir de ahí, la conversación continúa libremente con el input de texto al pie.

---

## 8. PESTAÑA "ARRANQUES"

Grilla de la zona de contenido:

```
┌──────────────────────────────┬───────────────────────────────┐
│  DATOS DE LOCACIÓN           │  DATOS DE BOMBA               │
│                              │  [menú retráctil] + 2 columnas│
├──────────────────────────────┴───────────────────────────────┤
│  CHAT IA                                                      │
│  (ocupa el resto del alto)                                    │
├───────────────────────────────────────────────────────────────┤
│  ▷  input de texto                                            │
└───────────────────────────────────────────────────────────────┘
```

Fila superior: dos recuadros del mismo alto, 38 % / 62 %.

### 8.1 Recuadro DATOS DE LOCACIÓN

Título del recuadro: `DATOS DE LOCACIÓN`. Tres campos numéricos apilados:

- `PRESIÓN DE SUCCIÓN` — sufijo `psi.g`
- `PRESIÓN A ROMPER` — sufijo `psi.g`
- `CAUDAL ESPERADO` — sufijo `USbl/día`

Mismo estilo y validación que 7.3. Debajo, un botón primario **"GENERAR ANÁLISIS DE ARRANQUE"**,
deshabilitado hasta que los tres campos tengan valor y haya una bomba seleccionada.

### 8.2 Recuadro DATOS DE BOMBA

- A la izquierda del recuadro, el **menú retráctil de bombas** (sección 6), en columna angosta.
- A la derecha, los mismos 13 campos en dos columnas de texto, con idéntico formato que 7.1.

### 8.3 Recuadro CHAT IA

Usa `<ChatIA />` (sección 11), ocupando todo el ancho y el alto restante, con el input de texto
pegado abajo, en una barra propia con un botón de enviar en forma de triángulo ▷ a la izquierda
(como en el boceto).

- **Estado vacío:** texto atenuado en una línea: `Completa los datos de locación y selecciona una bomba.`
- Al pulsar "GENERAR ANÁLISIS DE ARRANQUE", el asistente responde (mock, escritura progresiva)
  con tres bloques cortos, con estos encabezados literales:
  - `LIMITACIONES`
  - `RECOMENDACIONES`
  - `OTROS`
- Luego la conversación continúa libre.

---

## 9. PESTAÑA "DOCUMENTACIÓN"

Diseño libre pero sobrio y consistente con el resto. Incluye:

- Encabezado con un buscador (input con icono de lupa) que filtra la lista en vivo.
- Una fila de chips de filtro por categoría: `Manuales`, `Curvas`, `Fichas técnicas`, `Procedimientos`, `Normativa`.
- Una grilla de tarjetas de documento (3 columnas). Cada tarjeta:
  icono de tipo de archivo, nombre del documento, categoría como chip, tamaño y fecha en texto
  atenuado, y dos acciones: **Ver** (abre un modal con un visor placeholder) y **Descargar**
  (por ahora no hace nada real; deja `// TODO(backend): conectar descarga`).
- Debajo, un bloque **ENLACES EXTERNOS**: lista de filas con título, dominio y un icono de enlace externo.
- Llena todo con ~9 documentos y ~4 enlaces mock plausibles de bombas HPS (manual de operación,
  curvas de fábrica, ficha técnica TJ12000, procedimiento de arranque, hoja de seguridad, etc.).
- Estado vacío del buscador: una línea de texto atenuado, sin ilustraciones.

---

## 10. PESTAÑA "CRÉDITOS"

Diseño libre, una sola columna centrada, máximo 720px de ancho. Incluye:

- Bloque de marca: `HPS-DOOM`, versión `v0.1`, y una línea de descripción de máximo 12 palabras.
- **DESARROLLO** — tarjetas con nombre y rol (usa placeholders: `Nombre Apellido — Desarrollo`,
  `Nombre Apellido — Ingeniería de producción`, `Nombre Apellido — Diseño`).
- **TECNOLOGÍAS** — chips: React, TypeScript, Tailwind CSS, Recharts, shadcn/ui.
- **AGRADECIMIENTOS** — dos o tres líneas de placeholder.
- Pie: `© 2026 HPS-DOOM` y un enlace de contacto placeholder.

---

## 11. COMPONENTE `<ChatIA />` (reutilizable en ambas pestañas)

Un único componente, parametrizable por `contexto: 'curvas' | 'arranques'`.

**Estructura vertical:**

1. Barra superior compacta: título `CHAT IA`, chip con la bomba activa, y un botón icono
   **"Nueva conversación"** (papelera) que limpia el historial de ese contexto.
2. Área de mensajes con scroll propio y autoscroll al último mensaje.
   - Mensaje del usuario: alineado a la derecha, burbuja con fondo sutil, radio 8px.
   - Mensaje del asistente: alineado a la izquierda, sin burbuja, texto plano bien espaciado,
     con los encabezados de bloque en mayúsculas 11px y color atenuado.
   - Mientras "responde": tres puntos animados.
3. Barra de input al pie, siempre visible: textarea de una línea que crece hasta 3 líneas,
   placeholder `Escribe tu consulta…`, y botón de enviar en forma de **triángulo ▷**.
   `Enter` envía, `Shift+Enter` salta línea.

**Comportamiento:**

- El historial se guarda en `SessionContext`, **separado por contexto** (curvas y arranques mantienen
  conversaciones distintas).
- **El historial se borra al terminar la sesión**: vive solo en memoria, no se persiste en
  `localStorage`, `sessionStorage`, cookies ni ningún almacenamiento. Al recargar la página el chat
  aparece vacío. Esto es un requisito, no una sugerencia.
- Las respuestas vienen de `chatService.sendMessage()` / `chatService.runInitialAnalysis()`, que hoy
  devuelven texto mock tras un retardo simulado y con efecto de escritura progresiva.
  Deja el comentario `// TODO(backend): conectar LLM real. La firma no debe cambiar.`
- El servicio debe recibir un objeto de contexto tipado que ya incluya: bomba seleccionada,
  inputs actuales (operación o locación según la pestaña) y el historial. Aunque hoy los ignore,
  la firma debe estar lista.

---

## 12. ESTADOS, RESPONSIVE Y ACCESIBILIDAD

- **Cargando:** skeletons con shimmer en datos de bomba y gráfico. Nunca spinners a pantalla completa.
- **Vacío:** una sola línea de texto atenuado. Sin ilustraciones, sin tarjetas de ayuda.
- **Error:** franja hairline roja dentro del recuadro afectado, con texto corto y botón "Reintentar".
- **Responsive:** optimizado para 1280px+. Por debajo de 1024px las columnas se apilan verticalmente
  y el sidebar se convierte en una barra superior con iconos. No inviertas esfuerzo en móvil.
- **Accesibilidad:** foco visible en todos los controles (anillo de 2px con el acento), navegación
  completa por teclado, `aria-label` en botones de icono, y el indicador de estado nunca depende
  solo del color.
- Respeta `prefers-reduced-motion`: desactiva la escritura progresiva y las transiciones.

---

## 13. CRITERIOS DE ACEPTACIÓN

Al terminar, esto debe cumplirse:

1. Las 4 pestañas navegan y la activa se pinta en celeste sólido en el sidebar.
2. El toggle claro/oscuro cambia toda la app, gráfico incluido, sin colores rotos.
3. El menú retráctil colapsa y expande, y la bomba seleccionada se comparte entre pestañas.
4. Cambiar de bomba actualiza los 13 datos y redibuja las curvas del gráfico.
5. Con los 4 campos de operación llenos, "EVALUAR" dibuja el marcador naranja en el gráfico y
   el indicador muestra icono + color + texto.
6. "INICIAR ANÁLISIS" solo se habilita después de evaluar, y produce los tres bloques indicados.
7. En Arranques, "GENERAR ANÁLISIS DE ARRANQUE" produce LIMITACIONES / RECOMENDACIONES / OTROS.
8. Al recargar la página, ambos chats aparecen vacíos.
9. No hay ni una fórmula, ni un párrafo explicativo, ni texto de relleno en la interfaz.
10. Ningún componente lee datos directamente de un archivo mock: todo pasa por `services/`.

---

## 14. QUÉ NO HACER

- No implementes cálculos hidráulicos reales ni interpolación de curvas de fábrica.
- No agregues gráficos de doble eje Y.
- No cicles colores de series ni generes colores nuevos: usa exactamente la rampa dada.
- No uses `localStorage`/`sessionStorage` para el chat ni para los inputs.
- No agregues login, perfiles, notificaciones, dashboards extra ni landing page.
- No cambies los textos de las etiquetas ni las unidades.
- No uses emojis en la interfaz.
