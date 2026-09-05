/**
 * HPS-DOOM — Consideraciones de la evaluación del punto de operación.
 *
 * Describe, en lenguaje que un modelo pueda usar para razonar y explicar, las
 * consideraciones con las que la pestaña "Curvas de eficiencia" decide si un
 * punto de operación está DENTRO, EN EL LÍMITE o FUERA de curva.
 *
 * No calcula nada: la evaluación la hace
 * codigo_lovable/src/services/operationService.ts. Este archivo es la fuente de
 * verdad *narrativa* de esas mismas reglas, para inyectarla como contexto.
 * Si cambias un umbral en el servicio, cámbialo también aquí.
 *
 * El glosario vive ahora en glosario.js y los eventos de campo en eventos.js.
 * Cada consideración enlaza con ambos: `glosario` lista los términos que hay
 * que entender para leerla, y `eventos` lista lo que el operador vería en
 * locación con ese mismo punto de operación.
 *
 * Uso típico:
 *   import { contextoParaEvaluacion, resumenParaPrompt } from "./evaluacion.js";
 *   const notas = contextoParaEvaluacion(resultadoDeLaEvaluacion);
 *   // …y se pasan al modelo junto con la consulta del operador.
 *
 * IMPORTANTE — consideraciones propuestas:
 * Seis consideraciones llevan `pendienteDeImplementar: true`. Están escritas y
 * documentadas aquí, pero operationService.ts todavía no las dispara. Sirven
 * como contexto para el modelo y como especificación para implementarlas.
 * Ver LISTA_PENDIENTES al final del archivo.
 */

import { DANOS } from "./eventos.js";

// ---------------------------------------------------------------------------
// Umbrales — deben coincidir con operationService.ts
// ---------------------------------------------------------------------------

export const UMBRALES = {
  torDentroHeadPct: 4,
  tolLimiteHeadPct: 8,
  margenCaudal: 0.08,
  bepMinPct: 70,
  bepMaxPct: 120,
  tolFrecuenciaHz: 0.5,
  hzBase: 60,
  hzMax: 60,
};

/**
 * Umbrales de las consideraciones todavía no implementadas en el servicio.
 * Se mantienen aparte para que quede claro qué está vivo y qué es propuesta.
 */
export const UMBRALES_PROPUESTOS = {
  succionMinimaPsi: 30,
  succionAltaPsi: 150,
  margenPotenciaPct: 95,
  margenVrpPct: 95,
  caidaHeadPorEvaluacionPct: 2,
  caudalNuloUSblDia: 50,
};

// ---------------------------------------------------------------------------
// Magnitudes derivadas — cómo se obtiene cada número que ve el operador
// ---------------------------------------------------------------------------

export const MAGNITUDES = {
  headMedido: "presión de descarga − presión de succión (psi)",
  headCurva: "head que predice la curva de fábrica a ese caudal y esa frecuencia (psi)",
  desviacion: "(head medido − head en curva) ÷ head en curva × 100 (%)",
  caudalMaximo: "caudal máximo de la curva a 60 Hz × (frecuencia ÷ 60) (USbl/día)",
  qBep: "caudal del BEP a 60 Hz × (frecuencia ÷ 60) (USbl/día)",
  mcsf: "MCSF a 60 Hz × (frecuencia ÷ 60) (USbl/día)",
  porcentajeBep: "caudal medido ÷ qBep × 100 (%)",
  eficiencia:
    "η = η_bep × [1 − 0,84873 × (1 − caudal/qBep)²]. Ajustado sobre las 8 condiciones documentadas de la TJ12000; reproduce la ficha con 0,02 puntos de error.",
  potencia: "caudal × head × densidad ÷ 58.764 ÷ (eficiencia/100) = potencia al eje (hp)",
  empujeAxial:
    "No se calcula: se deduce de porcentajeBep. Por debajo del 100 % la bomba trabaja en downthrust; por encima, el empuje se va invirtiendo hacia upthrust y a partir del runout el impulsor deja de apoyarse.",
};

// ---------------------------------------------------------------------------
// Empuje axial — la regla que traduce "dónde estoy en la curva" a "qué sufre"
// ---------------------------------------------------------------------------

/**
 * Régimen de empuje axial según la posición en la curva. Es una lectura
 * cualitativa, no una medición: sirve para explicarle al operador por qué
 * importa el caudal aunque la presión se vea bien.
 */
export const REGIMENES_EMPUJE = [
  {
    id: "downthrustSevero",
    tipo: "downthrust",
    severidad: "severo",
    desde: 0,
    hasta: 50,
    titulo: "Downthrust severo",
    resumen:
      "Caudal muy por debajo del BEP. Los impulsores se cargan al máximo contra el lado de succión y la energía que no sale como caudal se queda dentro como calor.",
    danos: ["DA-02", "DA-03", "DA-08", "DA-14"],
  },
  {
    id: "downthrustAlto",
    tipo: "downthrust",
    severidad: "moderado",
    desde: 50,
    hasta: 70,
    titulo: "Downthrust alto",
    resumen:
      "Por debajo de la ventana recomendada. La cámara de empuje trabaja por encima de lo previsto y las arandelas se consumen más rápido.",
    danos: ["DA-02", "DA-03"],
  },
  {
    id: "downthrustDiseno",
    tipo: "downthrust",
    severidad: "leve",
    desde: 70,
    hasta: 100,
    titulo: "Downthrust de diseño",
    resumen:
      "Es la condición normal y sana: la bomba está pensada para llevar algo de empuje hacia la succión. Aquí no hay nada que corregir.",
    danos: [],
  },
  {
    id: "transicion",
    tipo: "transicion",
    severidad: "leve",
    desde: 100,
    hasta: 120,
    titulo: "Zona de transición",
    resumen:
      "El empuje va perdiendo fuerza y se acerca al punto donde cambia de sentido. Todavía es zona sana, pero el margen hacia upthrust se acorta.",
    danos: [],
  },
  {
    id: "upthrustIncipiente",
    tipo: "upthrust",
    severidad: "moderado",
    desde: 120,
    hasta: 140,
    titulo: "Upthrust incipiente",
    resumen:
      "Por encima de la ventana recomendada. El empuje ya se invirtió y los impulsores empiezan a levantarse de su apoyo normal.",
    danos: ["DA-01", "DA-03", "DA-12"],
  },
  {
    id: "upthrustSevero",
    tipo: "upthrust",
    severidad: "severo",
    desde: 140,
    hasta: Infinity,
    titulo: "Upthrust severo",
    resumen:
      "Zona de runout. Los impulsores quedan repiqueteando contra el lado de descarga, las arandelas se consumen en horas y el eje empieza a fatigarse. Es el modo de falla más rápido de una HPS.",
    danos: ["DA-01", "DA-03", "DA-12", "DA-04", "DA-05", "DA-11"],
  },
];

/**
 * Traduce el porcentaje del BEP al régimen de empuje que le corresponde.
 * @param {number} porcentajeBep
 * @returns {(typeof REGIMENES_EMPUJE)[number] | undefined}
 */
export function empujeAxialDelPunto(porcentajeBep) {
  if (!Number.isFinite(porcentajeBep)) return undefined;
  return REGIMENES_EMPUJE.find(
    (r) => porcentajeBep >= r.desde && porcentajeBep < r.hasta
  );
}

/** Frase lista para mostrar al operador. */
export function explicarEmpuje(porcentajeBep) {
  const r = empujeAxialDelPunto(porcentajeBep);
  if (!r) return "Sin caudal fiable no se puede saber cómo está cargada la bomba.";
  return `Al ${Math.round(porcentajeBep)} % del BEP la bomba está en ${r.titulo.toLowerCase()}. ${r.resumen}`;
}

// ---------------------------------------------------------------------------
// Las consideraciones, una a una
// ---------------------------------------------------------------------------

/**
 * @typedef {object} EmpujeDeConsideracion
 * @property {"upthrust"|"downthrust"|"transicion"|"ninguno"} tipo
 * @property {"leve"|"moderado"|"severo"|"no aplica"} severidad
 * @property {string} porQue
 */

/**
 * @typedef {object} Consideracion
 * @property {string} id
 * @property {"caudal"|"head"|"bep"|"empuje"|"succion"|"potencia"|"presion"|"tendencia"|"informativa"} bloque
 * @property {string} titulo
 * @property {string} condicion    Regla exacta que la dispara.
 * @property {"fuera"|"limite"|"ninguno"} estado  Nivel que impone al veredicto.
 * @property {string} mensaje      Texto que la aplicación muestra al operador.
 * @property {string} significado  Qué está ocurriendo físicamente.
 * @property {string[]} causas     Explicaciones probables, de más a menos común.
 * @property {string[]} acciones   Qué hacer, en orden.
 * @property {string} riesgo       Consecuencia de sostener esa condición.
 * @property {EmpujeDeConsideracion} empujeAxial  Cómo carga la bomba este punto.
 * @property {string[]} danos      IDs del catálogo DANOS de eventos.js.
 * @property {string[]} [eventos]  IDs de eventos.js que el operador vería en campo.
 * @property {string[]} [glosario] Claves de glosario.js necesarias para leerla.
 * @property {boolean} [pendienteDeImplementar]  true = todavía no la dispara el servicio.
 */

/** @type {Record<string, Consideracion>} */
export const CONSIDERACIONES = {
  // --- Bloque 1: caudal. Excluyentes entre sí, sólo se dispara la primera. ---
  caudalSobreMaximo: {
    id: "caudalSobreMaximo",
    bloque: "caudal",
    titulo: "Caudal por encima del máximo de la curva",
    condicion: "caudal > caudalMaximo",
    estado: "fuera",
    mensaje: "El caudal supera el máximo de la curva a X Hz (N USbl/día).",
    significado:
      "El punto cae fuera del dominio de la curva de fábrica: la bomba está entregando más caudal del que el fabricante caracterizó a esa velocidad. Ya no hay curva contra la que compararlo.",
    causas: [
      "Contrapresión de descarga mucho menor que la de diseño (línea abierta, VRP mal seteada)",
      "Las otras bombas del cabezal salieron de servicio y desapareció la contrapresión que sostenía el punto",
      "Ruptura de línea aguas abajo",
      "Lectura de caudal errónea o medidor descalibrado",
      "Frecuencia real por encima de la declarada",
    ],
    acciones: [
      "Contrastar la lectura del caudalímetro antes de actuar sobre un dato falso",
      "Verificar el seteo de la VRP y la presión de descarga",
      "Bajar frecuencia y estrangular hasta devolver el caudal al dominio de la curva",
      "Recorrer la línea buscando ruptura si la contrapresión desapareció de golpe",
    ],
    riesgo:
      "Sobrecarga del motor, cavitación por NPSH insuficiente y upthrust severo en las etapas. Es la condición que menos tiempo tolera la unidad.",
    empujeAxial: {
      tipo: "upthrust",
      severidad: "severo",
      porQue:
        "Fuera del dominio de la curva el empuje ya se invirtió del todo: los impulsores dejan de apoyarse en su arandela y quedan golpeando contra el lado de descarga. Las arandelas se consumen en horas y el eje empieza a fatigarse.",
    },
    danos: ["DA-01", "DA-03", "DA-12", "DA-04", "DA-11", "DA-05"],
    eventos: ["EV-03", "EV-25", "EV-23"],
    glosario: ["runout", "upthrust", "contrapresion", "vrp", "npsh"],
  },

  caudalBajoMcsf: {
    id: "caudalBajoMcsf",
    bloque: "caudal",
    titulo: "Caudal por debajo del MCSF",
    condicion: "caudal < mcsf",
    estado: "fuera",
    mensaje:
      "El caudal está por debajo del mínimo continuo estable (MCSF N USbl/día): riesgo de recirculación y vibración.",
    significado:
      "La bomba trabaja en una zona donde el flujo se desprende del impulsor y recircula dentro de las etapas. La energía que no sale como caudal se queda dentro convertida en calor.",
    causas: [
      "Estrangulamiento excesivo en descarga",
      "Aporte de fluido insuficiente en succión",
      "Obstrucción aguas abajo o turbina del medidor tapada",
      "Frecuencia demasiado alta para el caudal disponible",
    ],
    acciones: [
      "Abrir la descarga o bajar frecuencia hasta superar el MCSF",
      "Revisar el nivel y la disponibilidad de fluido en succión",
      "Tomar temperatura del cuerpo de la bomba: confirma si la recirculación ya está calentando",
      "Si es una condición sostenida, replantear el punto de diseño",
    ],
    riesgo:
      "Vibración, daño de cojinetes y sellos, calentamiento del fluido retenido y erosión por recirculación.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "severo",
      porQue:
        "Cuanto menos caudal, más se cargan los impulsores contra el lado de succión. En el extremo, con la descarga cerrada, el empuje hacia la succión es el máximo que puede darse.",
    },
    danos: ["DA-02", "DA-03", "DA-08", "DA-14", "DA-12", "DA-07"],
    eventos: ["EV-04", "EV-05", "EV-15"],
    glosario: ["mcsf", "recirculacion", "downthrust", "recalentamiento", "shutOff"],
  },

  caudalCercaRunout: {
    id: "caudalCercaRunout",
    bloque: "caudal",
    titulo: "Caudal cerca del extremo derecho (runout)",
    condicion: "caudal > caudalMaximo × 0,92 (último 8 % del rango)",
    estado: "limite",
    mensaje: "El caudal está cerca del extremo derecho de la curva (runout).",
    significado:
      "Todavía dentro de la curva, pero en la zona donde la potencia demandada y el NPSH requerido crecen deprisa.",
    causas: [
      "Poca contrapresión en el cabezal",
      "Frecuencia alta con línea poco restringida",
    ],
    acciones: [
      "Vigilar amperaje del motor y NPSH disponible",
      "Considerar bajar frecuencia para centrar el punto en la curva",
      "Revisar por qué se perdió contrapresión antes de que el punto se vaya del todo",
    ],
    riesgo: "Margen escaso frente a sobrecarga del motor, cavitación y upthrust.",
    empujeAxial: {
      tipo: "upthrust",
      severidad: "moderado",
      porQue:
        "En esta zona el empuje ya cambió de sentido y los impulsores empiezan a levantarse. Todavía es reversible sin daño si se corrige pronto.",
    },
    danos: ["DA-01", "DA-03", "DA-12", "DA-05"],
    eventos: ["EV-03"],
    glosario: ["runout", "upthrust", "npsh", "contrapresion"],
  },

  caudalJustoSobreMcsf: {
    id: "caudalJustoSobreMcsf",
    bloque: "caudal",
    titulo: "Caudal justo por encima del MCSF",
    condicion: "caudal < mcsf × 1,16",
    estado: "limite",
    mensaje: "El caudal está justo por encima del MCSF.",
    significado:
      "El punto es admisible pero tiene poco margen antes de entrar en recirculación.",
    causas: ["Estrangulamiento alto", "Caída del aporte en succión"],
    acciones: [
      "Vigilar vibración y temperatura",
      "Abrir algo la descarga o bajar frecuencia para ganar margen",
    ],
    riesgo: "Cualquier caída de caudal lleva la bomba a zona de recirculación.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "Está en la parte baja de la curva, donde el empuje hacia la succión ya es mayor que el de diseño. No es dañino todavía, pero no queda colchón.",
    },
    danos: ["DA-02", "DA-03"],
    eventos: ["EV-04", "EV-07"],
    glosario: ["mcsf", "downthrust", "estrangular"],
  },

  sinCaudalConHead: {
    id: "sinCaudalConHead",
    bloque: "caudal",
    titulo: "Head normal o alto sin caudal",
    condicion: "caudal ≈ 0 (< 50 USbl/día) y head medido > 0",
    estado: "fuera",
    mensaje:
      "Hay presión pero no hay caudal: la bomba está recirculando. Revisar temperatura del cuerpo y abrir descarga de inmediato.",
    significado:
      "El fluido está dando vueltas dentro de la bomba sin lograr salir. No consigue vencer la presión de la línea para entrar a la convergencia del flujo, así que toda la potencia del motor se queda adentro como calor.",
    causas: [
      "Descarga cerrada o casi cerrada",
      "Presión del cabezal por encima de la que la bomba puede vencer",
      "Check de descarga pegado u obstrucción total",
      "Caudal cero falso: MC-II sin señal",
    ],
    acciones: [
      "Confirmar primero que el cero es real y no un MC-II caído",
      "Tocar el cuerpo de la bomba: si está caliente, la recirculación está confirmada",
      "Abrir descarga o bajar frecuencia de inmediato",
      "Si no se restablece caudal en minutos, parar la unidad",
    ],
    riesgo:
      "El fluido retenido se vaporiza, el sello se queda sin lubricación y el conjunto rotativo se dilata hasta rozar. Es cuestión de minutos, no de horas.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "severo",
      porQue:
        "Caudal cero con presión máxima es el extremo izquierdo de la curva: el empuje hacia la succión llega a su máximo. Conviene decirlo claro porque se confunde a menudo: esto es downthrust, no upthrust. El upthrust es lo contrario, caudal excesivo con presión baja.",
    },
    danos: ["DA-02", "DA-08", "DA-07", "DA-15", "DA-06"],
    eventos: ["EV-05", "EV-15", "EV-19"],
    glosario: ["recirculacion", "shutOff", "downthrust", "recalentamiento"],
    pendienteDeImplementar: true,
  },

  // --- Bloque 2: head medido frente a la curva -----------------------------
  headMuyPorDebajo: {
    id: "headMuyPorDebajo",
    bloque: "head",
    titulo: "Head muy por debajo de la curva",
    condicion: "desviacion < −8 %",
    estado: "fuera",
    mensaje:
      "El head medido está X % por debajo de la curva: revisar desgaste, recirculación interna o error de instrumentación.",
    significado:
      "La bomba no está entregando la presión que le corresponde: ha perdido capacidad hidráulica o la medida es falsa.",
    causas: [
      "Desgaste de etapas y anillos: es la causa más común de una caída progresiva",
      "Recirculación interna por holguras abiertas",
      "Manómetros descalibrados o mal ubicados",
      "Frecuencia real menor que la declarada",
      "Fluido más ligero que el de la curva (menos psi para el mismo head en pies)",
      "Aire o gas atrapado dentro de la bomba",
      "Rotación invertida, si viene de una intervención eléctrica reciente",
    ],
    acciones: [
      "Contrastar los manómetros de succión y descarga",
      "Comparar la frecuencia del variador con la declarada",
      "Revisar el histórico: una caída progresiva apunta a desgaste; una brusca, a instrumentación o a un fallo mecánico",
      "Programar inspección si el desgaste se confirma",
    ],
    riesgo:
      "Pérdida de producción y, si es desgaste, deterioro acelerado hasta el fallo de la unidad.",
    empujeAxial: {
      tipo: "upthrust",
      severidad: "leve",
      porQue:
        "Una bomba que da menos presión de la que debería termina operando más a la derecha de su curva para el mismo sistema. El punto se corre hacia upthrust, y el desgaste se retroalimenta.",
    },
    danos: ["DA-10", "DA-01", "DA-17"],
    eventos: ["EV-02", "EV-26", "EV-18", "EV-28"],
    glosario: ["desgasteDeEtapas", "curvaDeFabrica", "gasLock", "upthrust"],
  },

  headMuyPorEncima: {
    id: "headMuyPorEncima",
    bloque: "head",
    titulo: "Head muy por encima de la curva",
    condicion: "desviacion > +8 %",
    estado: "fuera",
    mensaje:
      "El head medido está X % por encima de la curva: revisar la lectura de presión o la frecuencia real.",
    significado:
      "Una bomba no puede superar su curva de fábrica de forma sostenida. Casi siempre es un problema de medida o de datos.",
    causas: [
      "Manómetro de descarga descalibrado o midiendo aguas abajo de una restricción",
      "Frecuencia real mayor que la declarada",
      "Fluido más denso que el de la curva",
      "Caudal mal medido (a menor caudal real, mayor head)",
      "Presión de succión fuera de rango que se está sumando a la descarga",
    ],
    acciones: [
      "Verificar los dos manómetros contra un patrón",
      "Confirmar la frecuencia en el variador",
      "Confirmar la densidad del fluido",
      "Revisar si hay alarmas bypasseadas que estén ocultando la condición real",
    ],
    riesgo:
      "Se está operando a ciegas: si el dato bueno es el head, puede haberse superado la presión máxima de trabajo.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "Si el head alto es real, el punto está a la izquierda de la curva y la bomba lleva más empuje hacia la succión del previsto. Si es falso, el riesgo es peor: no se sabe dónde está operando.",
    },
    danos: ["DA-13", "DA-02", "DA-18", "DA-07"],
    eventos: ["EV-01", "EV-06", "EV-11"],
    glosario: ["manometroAnalogo", "bypassDeAlarmas", "densidad", "downthrust"],
  },

  headDesviacionModerada: {
    id: "headDesviacionModerada",
    bloque: "head",
    titulo: "Desviación moderada de head",
    condicion: "4 % < |desviacion| ≤ 8 %",
    estado: "limite",
    mensaje: "Desviación de X % respecto a la curva de fábrica.",
    significado:
      "Diferencia todavía compatible con la tolerancia de instrumentación de campo, pero merece seguimiento.",
    causas: [
      "Deriva de instrumentación",
      "Desgaste incipiente si la desviación es negativa y crece con el tiempo",
    ],
    acciones: [
      "Registrar el valor y comparar con evaluaciones anteriores",
      "Si la tendencia empeora, tratarlo como desgaste",
    ],
    riesgo: "Ninguno inmediato; es una señal temprana.",
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue:
        "Una desviación dentro de tolerancia no mueve el punto lo bastante como para cambiar el régimen de empuje.",
    },
    danos: [],
    eventos: ["EV-26"],
    glosario: ["curvaDeFabrica", "desgasteDeEtapas"],
  },

  caidaProgresivaDeHead: {
    id: "caidaProgresivaDeHead",
    bloque: "tendencia",
    titulo: "El head viene cayendo evaluación tras evaluación",
    condicion:
      "la desviación de head baja más de 2 puntos porcentuales entre evaluaciones consecutivas, de forma sostenida",
    estado: "limite",
    mensaje:
      "El head viene cayendo respecto a la curva de forma sostenida: patrón de desgaste, no de instrumentación.",
    significado:
      "Un instrumento descalibrado da un error fijo; el desgaste da una caída que crece. Si la desviación empeora evaluación tras evaluación, la bomba está perdiendo capacidad de verdad.",
    causas: [
      "Desgaste normal de etapas y anillos por horas de operación",
      "Erosión acelerada por sólidos en el fluido",
      "Cavitación sostenida",
      "Tiempo acumulado operando fuera de la ventana del BEP",
    ],
    acciones: [
      "Documentar la tendencia y proyectar cuándo el head dejará de ser suficiente",
      "Atacar lo que la acelera: sólidos, cavitación y operación fuera de ventana",
      "Planificar el cambio de la unidad antes de que sea una parada no programada",
    ],
    riesgo:
      "Si no se planifica, el desgaste termina en parada no programada y en pérdida de producción del cliente.",
    empujeAxial: {
      tipo: "upthrust",
      severidad: "leve",
      porQue:
        "Con menos presión disponible, para el mismo sistema el punto se corre a la derecha y el empuje se acerca a la inversión. El desgaste se acelera a sí mismo.",
    },
    danos: ["DA-10", "DA-17", "DA-01"],
    eventos: ["EV-26", "EV-22", "EV-17"],
    glosario: ["desgasteDeEtapas", "frecuenciaEquivalente", "solidos"],
    pendienteDeImplementar: true,
  },

  // --- Bloque 3: distancia al BEP -----------------------------------------
  fueraVentanaBep: {
    id: "fueraVentanaBep",
    bloque: "bep",
    titulo: "Fuera de la ventana recomendada del BEP",
    condicion: "porcentajeBep < 70 % o > 120 %",
    estado: "limite",
    mensaje:
      "Operando al X % del BEP; fuera de la ventana recomendada de 70–120 %.",
    significado:
      "El punto es alcanzable pero no es donde la bomba trabaja mejor: la eficiencia cae, aparecen cargas radiales asimétricas y el empuje axial se aleja del de diseño.",
    causas: [
      "Punto de operación mal ajustado para la demanda real",
      "Frecuencia elegida sin considerar dónde queda el BEP a esa velocidad",
      "Cambios en el cabezal que movieron el punto sin que nadie lo reajustara",
    ],
    acciones: [
      "Ajustar frecuencia para acercar el caudal al BEP",
      "Mirar de qué lado se salió: por debajo del 70 % es downthrust, por encima del 120 % es upthrust, y no se corrigen igual",
      "Si la demanda es estable y muy distinta del BEP, replantear el número de etapas o el modelo",
    ],
    riesgo:
      "Mayor consumo por barril, y a largo plazo desgaste de arandelas de empuje, cojinetes y sellos.",
    empujeAxial: {
      tipo: "transicion",
      severidad: "moderado",
      porQue:
        "Esta consideración se dispara por los dos lados, así que el empuje depende de cuál. Usa empujeAxialDelPunto(porcentajeBep) para saber el régimen exacto: por debajo del 70 % es downthrust alto, por encima del 120 % es upthrust incipiente y a partir del 140 % es upthrust severo.",
    },
    danos: ["DA-03", "DA-02", "DA-01", "DA-12"],
    eventos: ["EV-03", "EV-04"],
    glosario: ["bep", "empujeAxial", "upthrust", "downthrust", "arandelasDeEmpuje"],
  },

  // --- Bloque 4: succión ---------------------------------------------------
  presionSuccionBaja: {
    id: "presionSuccionBaja",
    bloque: "succion",
    titulo: "Presión de succión por debajo del mínimo",
    condicion: "presión de succión < 30 psi (ajustar al mínimo de cada unidad)",
    estado: "fuera",
    mensaje:
      "La presión de succión está por debajo del mínimo: riesgo de cavitación.",
    significado:
      "A la bomba no le llega el colchón de presión que necesita en la entrada. Si baja lo suficiente, el fluido hierve dentro de la bomba y las burbujas empiezan a picar los impulsores.",
    causas: [
      "Bomba booster apagada o fallando",
      "Strainer sucio",
      "El cliente no está entregando el fluido necesario",
      "Nivel bajo en tanque o pulmón",
      "Caudal excesivo: cuanto más a la derecha operas, más presión de succión necesita la bomba",
    ],
    acciones: [
      "Confirmar el funcionamiento de la bomba booster antes que nada",
      "Revisar el diferencial del strainer",
      "Bajar frecuencia: a menos caudal, menos presión de succión requiere la bomba",
      "Confirmar el aporte del lado del cliente",
    ],
    riesgo:
      "Cavitación, que es daño acumulado e irreversible en impulsores, y falla del sello mecánico.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "La falta de aporte arrastra el caudal hacia abajo y con él el punto hacia la izquierda. Con todo, el riesgo dominante aquí no es el empuje sino la cavitación.",
    },
    danos: ["DA-05", "DA-06", "DA-07", "DA-10"],
    eventos: ["EV-10", "EV-12", "EV-14", "EV-17", "EV-27"],
    glosario: ["presionSuccion", "npsh", "cavitacion", "bombaBooster", "strainer"],
    pendienteDeImplementar: true,
  },

  presionSuccionAlta: {
    id: "presionSuccionAlta",
    bloque: "succion",
    titulo: "Presión de succión por encima del rango",
    condicion:
      "presión de succión > 150 psi, o succión + head por encima de la presión máxima de trabajo",
    estado: "limite",
    mensaje:
      "La presión de succión está alta: se está sumando a la descarga y castigando el sello mecánico.",
    significado:
      "Está llegando más presión de la que la unidad necesita. Esa presión se suma íntegra a la descarga, así que la carcasa y el sello trabajan más cargados de lo previsto aunque la bomba esté aportando lo de siempre.",
    causas: [
      "El cliente está entregando con más presión de la acordada",
      "Booster sobredimensionada para el régimen actual",
      "La HPS está tomando menos caudal del que le llega",
      "Bypass cerrado",
    ],
    acciones: [
      "Si hay margen de descarga, subir frecuencia: al tomar más caudal la succión baja sola. Es la opción preferida.",
      "Si ya no queda margen, aperturar levemente la válvula de bypass",
      "Comparar succión más head contra la presión máxima de trabajo de la unidad",
      "Coordinar con el cliente si el exceso viene de su lado",
    ],
    riesgo:
      "Fuga por el sello mecánico y, en el extremo, superar la presión de trabajo de la carcasa. Es un riesgo de seguridad, no sólo de equipo.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "leve",
      porQue:
        "La presión de succión alta descarga algo el apoyo normal de los impulsores, pero mientras el caudal siga en ventana el régimen de empuje no cambia. Aquí el que sufre es el sello.",
    },
    danos: ["DA-07", "DA-13", "DA-16"],
    eventos: ["EV-11", "EV-06", "EV-16"],
    glosario: ["presionSuccion", "selloMecanico", "bypass"],
    pendienteDeImplementar: true,
  },

  // --- Bloque 5: potencia y presión de trabajo -----------------------------
  potenciaSobreNominal: {
    id: "potenciaSobreNominal",
    bloque: "potencia",
    titulo: "Potencia al eje cerca o por encima de la nominal del motor",
    condicion: "potencia calculada > 95 % de la potencia nominal del motor",
    estado: "fuera",
    mensaje:
      "La potencia que pide la bomba está en el límite de lo que el motor puede entregar.",
    significado:
      "El punto de operación exige más de lo que el motor tiene disponible. En la zona de runout la potencia crece muy rápido, así que se puede llegar aquí sin que nada más parezca anormal.",
    causas: [
      "Caudal excesivo: en runout la potencia demandada se dispara",
      "Fluido más denso que el declarado",
      "Escala o sólidos aumentando la carga mecánica",
      "Roce interno por desgaste o dilatación",
    ],
    acciones: [
      "Bajar frecuencia para reducir la carga",
      "Confirmar la densidad real del fluido",
      "Contrastar contra el amperaje leído en el variador",
      "Revisar el histórico: si viene subiendo desde hace semanas, es escala",
    ],
    riesgo:
      "Sobrecarga y quemado del motor. Con las alarmas del variador anuladas, no hay nada que lo detenga.",
    empujeAxial: {
      tipo: "upthrust",
      severidad: "moderado",
      porQue:
        "La causa más común de una potencia disparada es el exceso de caudal, que es exactamente la condición de upthrust. Conviene mirar el porcentaje del BEP antes de concluir.",
    },
    danos: ["DA-11", "DA-01", "DA-04", "DA-15"],
    eventos: ["EV-08", "EV-03", "EV-21"],
    glosario: ["potencia", "amperaje", "runout", "bypassDeAlarmas", "escala"],
    pendienteDeImplementar: true,
  },

  presionDescargaSobreVrp: {
    id: "presionDescargaSobreVrp",
    bloque: "presion",
    titulo: "Presión de descarga cerca o por encima del seteo de la VRP",
    condicion:
      "presión de descarga > 95 % del seteo de la VRP o de la presión máxima de trabajo",
    estado: "fuera",
    mensaje:
      "La presión de descarga está en el límite de lo admisible para esta unidad.",
    significado:
      "La carcasa, las bridas y el sello están trabajando cerca de la presión para la que fueron diseñados. Es lo primero que hay que resolver, antes que cualquier consideración de eficiencia.",
    causas: [
      "Obstrucción aguas abajo",
      "Contrapresión del cabezal por encima de lo previsto",
      "Presión de succión alta que se suma a la descarga",
      "VRP mal seteada",
      "Escala acumulada en la línea",
    ],
    acciones: [
      "Bajar frecuencia de inmediato para salir del límite",
      "Contrastar contra el manómetro análogo antes de dar la lectura por buena",
      "Liberar la obstrucción o coordinar el cabezal con el cliente",
      "Revisar el seteo de la VRP",
    ],
    riesgo:
      "Sobrepresión de la carcasa, fuga por el sello y riesgo de seguridad para el personal en locación.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "Una descarga alta suele venir con caudal bajo, así que el punto está a la izquierda y la bomba lleva más empuje hacia la succión del previsto.",
    },
    danos: ["DA-13", "DA-07", "DA-02", "DA-16"],
    eventos: ["EV-01", "EV-24", "EV-11"],
    glosario: ["vrp", "presionDescarga", "contrapresion", "manometroAnalogo"],
    pendienteDeImplementar: true,
  },

  // --- Bloque 6: informativas, no cambian el veredicto ---------------------
  frecuenciaNoCoincide: {
    id: "frecuenciaNoCoincide",
    bloque: "informativa",
    titulo: "La curva equivalente no es la declarada",
    condicion: "|frecuenciaEquivalente − frecuencia| > 0,5 Hz",
    estado: "ninguno",
    mensaje:
      "El punto medido cae sobre la curva de X Hz, no sobre la de Y Hz.",
    significado:
      "El punto medido coincide con la curva de otra velocidad. Es la forma más directa de cuantificar cuánto se aparta la bomba de su curva.",
    causas: [
      "El variador no está en la frecuencia que se cree",
      "La bomba entrega como si girase más despacio: desgaste",
      "Error en las lecturas de presión o caudal",
      "Rotación invertida, si viene de una intervención eléctrica reciente",
    ],
    acciones: [
      "Confirmar la frecuencia en el variador antes que nada",
      "Si el variador es correcto, la diferencia mide la pérdida hidráulica de la unidad",
      "Guardar el valor: su evolución en el tiempo es el mejor indicador de desgaste que existe",
    ],
    riesgo: "Depende de la causa; por sí sola es un diagnóstico, no una alarma.",
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue:
        "Es un indicador de estado de la bomba, no una condición de operación. El empuje lo definen el caudal y la posición en la curva.",
    },
    danos: ["DA-10"],
    eventos: ["EV-26", "EV-28"],
    glosario: ["frecuenciaEquivalente", "desgasteDeEtapas", "leyesDeAfinidad"],
  },

  sinDatosDeReferencia: {
    id: "sinDatosDeReferencia",
    bloque: "informativa",
    titulo: "Bomba sin BEP, MCSF ni curva de eficiencia",
    condicion: "la ficha de la bomba no trae esos datos (HPS-08 y HPS-09)",
    estado: "ninguno",
    mensaje:
      "El documento de esta bomba no trae BEP, MCSF ni curva de eficiencia: la evaluación se limita al contraste de head y caudal contra la curva.",
    significado:
      "Sus reportes AutographPC sólo incluyen la familia de curvas de head. Las comprobaciones de MCSF y de ventana del BEP se omiten.",
    causas: ["Documentación de fábrica incompleta"],
    acciones: [
      "No inferir eficiencia ni MCSF de otras unidades del mismo modelo: sus curvas no son proporcionales",
      "Pedir al fabricante la ficha completa si se necesita ese análisis",
      "Mientras tanto, vigilar temperatura y vibración con más frecuencia: son los sustitutos de campo del MCSF",
    ],
    riesgo:
      "El veredicto es menos exhaustivo: un caudal bajo peligroso podría no detectarse, y sin BEP no se puede calificar el empuje axial.",
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue:
        "Sin BEP no hay forma de decir en qué régimen de empuje está la bomba. Es justamente lo que se pierde al no tener la ficha completa.",
    },
    danos: ["DA-18"],
    eventos: ["EV-19"],
    glosario: ["bep", "mcsf", "empujeAxial"],
  },

  dentroDeTolerancia: {
    id: "dentroDeTolerancia",
    bloque: "informativa",
    titulo: "Punto conforme",
    condicion: "estado dentro y ninguna otra observación",
    estado: "ninguno",
    mensaje: "El punto de operación coincide con la curva de fábrica dentro de tolerancia.",
    significado: "Caudal en rango, head dentro del 4 % y caudal en la ventana del BEP.",
    causas: [],
    acciones: ["Registrar el punto como referencia para el seguimiento de tendencia"],
    riesgo: "Ninguno.",
    empujeAxial: {
      tipo: "downthrust",
      severidad: "leve",
      porQue:
        "Dentro de la ventana del BEP la bomba lleva el downthrust suave para el que fue diseñada. Es la condición sana, no un hallazgo.",
    },
    danos: [],
    eventos: [],
    glosario: ["bep", "downthrust"],
  },
};

// ---------------------------------------------------------------------------
// Cómo se combina el veredicto
// ---------------------------------------------------------------------------

export const REGLA_DE_VEREDICTO = {
  descripcion:
    "El estado arranca en DENTRO y sólo puede empeorar. Los bloques (caudal, head, BEP y, cuando se implementen, succión, potencia, presión y tendencia) se evalúan de forma independiente, así que un mismo punto puede acumular varias observaciones que cambien el estado, más las informativas.",
  precedencia: [
    "Si alguna consideración es de nivel 'fuera' → FUERA DE CURVA",
    "Si alguna es de nivel 'limite' y ninguna de 'fuera' → EN EL LÍMITE",
    "Si ninguna → DENTRO DE CURVA",
  ],
  excluyentes:
    "Dentro del bloque de caudal las consideraciones son excluyentes: sólo se dispara la primera que se cumpla, en el orden en que están listadas.",
  sinDatos:
    "Si falta alguno de los cuatro campos de entrada el resultado es SIN DATOS. El botón EVALUAR además se bloquea con frecuencias ≤ 0 o > 60 Hz.",
  prioridadDeAtencion:
    "Cuando varias se disparan a la vez, se atienden en este orden: primero lo que es riesgo de seguridad (presión de trabajo superada), después lo que rompe la bomba en horas (upthrust y caudal cero con presión), después lo que la rompe en días (downthrust severo, cavitación) y al final lo que sólo cuesta eficiencia.",
};

/** Orden de atención cuando se disparan varias consideraciones a la vez. */
export const PRIORIDAD = [
  "presionDescargaSobreVrp",
  "sinCaudalConHead",
  "caudalSobreMaximo",
  "caudalBajoMcsf",
  "potenciaSobreNominal",
  "presionSuccionBaja",
  "presionSuccionAlta",
  "headMuyPorEncima",
  "headMuyPorDebajo",
  "caudalCercaRunout",
  "caudalJustoSobreMcsf",
  "fueraVentanaBep",
  "caidaProgresivaDeHead",
  "headDesviacionModerada",
  "frecuenciaNoCoincide",
  "sinDatosDeReferencia",
  "dentroDeTolerancia",
];

/** Consideraciones escritas pero todavía no implementadas en operationService.ts. */
export const LISTA_PENDIENTES = Object.values(CONSIDERACIONES)
  .filter((c) => c.pendienteDeImplementar)
  .map((c) => c.id);

// ---------------------------------------------------------------------------
// Selección de contexto y volcado a texto
// ---------------------------------------------------------------------------

const POR_MENSAJE = [
  [/supera el máximo de la curva/i, "caudalSobreMaximo"],
  [/mínimo continuo estable/i, "caudalBajoMcsf"],
  [/extremo derecho de la curva/i, "caudalCercaRunout"],
  [/justo por encima del MCSF/i, "caudalJustoSobreMcsf"],
  [/presión pero no hay caudal/i, "sinCaudalConHead"],
  [/por debajo de la curva/i, "headMuyPorDebajo"],
  [/por encima de la curva/i, "headMuyPorEncima"],
  [/Desviación de .* respecto a la curva/i, "headDesviacionModerada"],
  [/viene cayendo respecto a la curva/i, "caidaProgresivaDeHead"],
  [/% del BEP/i, "fueraVentanaBep"],
  [/succión está por debajo del mínimo/i, "presionSuccionBaja"],
  [/succión está alta/i, "presionSuccionAlta"],
  [/límite de lo que el motor/i, "potenciaSobreNominal"],
  [/límite de lo admisible para esta unidad/i, "presionDescargaSobreVrp"],
  [/cae sobre la curva de/i, "frecuenciaNoCoincide"],
  [/no trae BEP, MCSF/i, "sinDatosDeReferencia"],
  [/dentro de tolerancia/i, "dentroDeTolerancia"],
];

/**
 * Devuelve sólo las consideraciones que se dispararon en una evaluación, para
 * inyectar al modelo el contexto pertinente y no el diccionario entero.
 * Salen ordenadas por prioridad de atención, no por orden de aparición.
 *
 * @param {{observaciones: string[]}} resultado Resultado de evaluateOperatingPoint.
 * @returns {Consideracion[]}
 */
export function contextoParaEvaluacion(resultado) {
  const ids = new Set();
  for (const obs of resultado?.observaciones ?? []) {
    const par = POR_MENSAJE.find(([re]) => re.test(obs));
    if (par) ids.add(par[1]);
  }
  return [...ids]
    .map((id) => CONSIDERACIONES[id])
    .filter(Boolean)
    .sort((a, b) => PRIORIDAD.indexOf(a.id) - PRIORIDAD.indexOf(b.id));
}

/**
 * Resume el daño esperado de una evaluación: qué le está pasando a la bomba,
 * en qué empuje está y qué se rompe si nadie corrige.
 *
 * @param {{observaciones: string[], porcentajeBep?: number}} resultado
 */
export function danoEsperado(resultado) {
  const consideraciones = contextoParaEvaluacion(resultado);
  const ids = new Set();
  for (const c of consideraciones) for (const d of c.danos ?? []) ids.add(d);
  const regimen = empujeAxialDelPunto(resultado?.porcentajeBep);
  if (regimen) for (const d of regimen.danos) ids.add(d);
  const orden = { terminal: 0, grave: 1, moderado: 2, leve: 3 };
  return {
    empuje: regimen ?? null,
    consideraciones: consideraciones.map((c) => c.id),
    danos: [...ids]
      .map((id) => DANOS[id])
      .filter(Boolean)
      .sort((a, b) => orden[a.gravedad] - orden[b.gravedad]),
  };
}

/** Vuelca todo el diccionario como texto plano, listo para un prompt de sistema. */
export function resumenParaPrompt({ incluirPendientes = true } = {}) {
  const l = [];
  l.push("REGLAS DE EVALUACIÓN DEL PUNTO DE OPERACIÓN (HPS-DOOM)");
  l.push("");
  l.push("Magnitudes:");
  for (const [k, v] of Object.entries(MAGNITUDES)) l.push(`- ${k}: ${v}`);
  l.push("");
  l.push("Empuje axial según la posición en la curva:");
  for (const r of REGIMENES_EMPUJE) {
    const hasta = r.hasta === Infinity ? "en adelante" : `a ${r.hasta} %`;
    l.push(`- ${r.desde} % ${hasta} del BEP → ${r.titulo}. ${r.resumen}`);
  }
  l.push("");
  l.push("Consideraciones:");
  for (const c of Object.values(CONSIDERACIONES)) {
    if (!incluirPendientes && c.pendienteDeImplementar) continue;
    const marca = c.pendienteDeImplementar ? " (propuesta, aún no implementada)" : "";
    l.push(`- [${c.estado}] ${c.titulo}${marca} — se dispara si ${c.condicion}.`);
    l.push(`  Mensaje: "${c.mensaje}"`);
    l.push(`  Significado: ${c.significado}`);
    if (c.causas.length) l.push(`  Causas probables: ${c.causas.join("; ")}.`);
    if (c.acciones.length) l.push(`  Acciones: ${c.acciones.join("; ")}.`);
    l.push(
      `  Empuje axial: ${c.empujeAxial.tipo} (${c.empujeAxial.severidad}). ${c.empujeAxial.porQue}`
    );
    if (c.danos?.length)
      l.push(
        `  Daños posibles: ${c.danos.map((d) => DANOS[d]?.titulo ?? d).join("; ")}.`
      );
    if (c.eventos?.length) l.push(`  En campo se ve como: ${c.eventos.join(", ")}.`);
    l.push(`  Riesgo: ${c.riesgo}`);
  }
  l.push("");
  l.push("Veredicto:");
  l.push(REGLA_DE_VEREDICTO.descripcion);
  for (const p of REGLA_DE_VEREDICTO.precedencia) l.push(`- ${p}`);
  l.push(`- ${REGLA_DE_VEREDICTO.excluyentes}`);
  l.push(`- ${REGLA_DE_VEREDICTO.sinDatos}`);
  l.push(`- ${REGLA_DE_VEREDICTO.prioridadDeAtencion}`);
  return l.join("\n");
}

/** Todo junto, por si prefieres pasar el diccionario como un solo objeto. */
export const diccionarioEvaluacion = {
  umbrales: UMBRALES,
  umbralesPropuestos: UMBRALES_PROPUESTOS,
  magnitudes: MAGNITUDES,
  regimenesEmpuje: REGIMENES_EMPUJE,
  consideraciones: CONSIDERACIONES,
  veredicto: REGLA_DE_VEREDICTO,
  prioridad: PRIORIDAD,
  pendientes: LISTA_PENDIENTES,
  empujeAxialDelPunto,
  explicarEmpuje,
  contextoParaEvaluacion,
  danoEsperado,
  resumenParaPrompt,
};

export default diccionarioEvaluacion;
