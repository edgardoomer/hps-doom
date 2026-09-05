/**
 * HPS-DOOM — Eventos de campo y árbol causa-efecto.
 *
 * Mientras evaluacion.js juzga un punto contra la curva de fábrica, este
 * archivo describe lo que el operador ve en locación: la descarga que subió,
 * el MC-II que se quedó en cero, el cuerpo de la bomba caliente. Cada evento
 * dice qué lo causa, qué revisar, qué hacer, qué empuje axial impone a la
 * bomba y a qué otros eventos lleva si no se corrige.
 *
 * Los campos `llevaA` y `provieneDe` son las aristas del árbol de sucesos que
 * dibuja arbolEventos.js. Están siempre en pares: si A lleva a B, B proviene
 * de A. La función `verificarIntegridad()` lo comprueba.
 *
 * Nota sobre el empuje axial: no se mide, se deduce del caudal. Poco caudal y
 * mucha presión es downthrust; mucho caudal y poca presión es upthrust. El
 * segundo es el que rompe bombas rápido. Ver el glosario.
 */

// ---------------------------------------------------------------------------
// Catálogo de daños — lo que la bomba se lleva en cada caso
// ---------------------------------------------------------------------------

/**
 * @typedef {object} Dano
 * @property {string} id
 * @property {string} titulo
 * @property {"mecanico"|"hidraulico"|"electrico"|"operativo"|"ambiental"} tipo
 * @property {"leve"|"moderado"|"grave"|"terminal"} gravedad
 * @property {string} queLePasaALaBomba  Mecanismo, en lenguaje llano.
 * @property {string} comoSeDetecta
 * @property {string} ventanaDeTiempo    Cuánto aguanta la unidad así.
 * @property {string[]} [derivaEn]       Otros daños que este desencadena.
 */

/** @type {Record<string, Dano>} */
export const DANOS = {
  "DA-01": {
    id: "DA-01",
    titulo: "Upthrust — empuje invertido hacia la descarga",
    tipo: "mecanico",
    gravedad: "grave",
    queLePasaALaBomba:
      "Con caudal excesivo el empuje se invierte: los impulsores se levantan de su apoyo normal y quedan repiqueteando contra el lado de descarga. Dejan de girar centrados.",
    comoSeDetecta:
      "Caudal muy por encima de lo normal con presión de descarga baja, vibración que aumenta al abrir la descarga y amperaje alto.",
    ventanaDeTiempo:
      "Horas. Es el modo de falla más rápido de una HPS: se corrige de inmediato, no se programa.",
    derivaEn: ["DA-03", "DA-12", "DA-04"],
  },

  "DA-02": {
    id: "DA-02",
    titulo: "Downthrust excesivo",
    tipo: "mecanico",
    gravedad: "moderado",
    queLePasaALaBomba:
      "Con poco caudal y mucha presión los impulsores se cargan contra el lado de succión con más fuerza de la prevista. La cámara de empuje trabaja por encima de su diseño.",
    comoSeDetecta:
      "Caudal bajo con presión de descarga alta, temperatura de la cámara de empuje por encima de lo habitual.",
    ventanaDeTiempo:
      "Días o semanas. Avisa antes de romper: primero sube la temperatura y cae el caudal.",
    derivaEn: ["DA-03", "DA-08", "DA-14"],
  },

  "DA-03": {
    id: "DA-03",
    titulo: "Desgaste de arandelas de empuje",
    tipo: "mecanico",
    gravedad: "moderado",
    queLePasaALaBomba:
      "Las arandelas sobre las que se apoya cada impulsor se consumen. Aparece juego axial y el conjunto rotativo empieza a moverse donde no debe.",
    comoSeDetecta:
      "No se ve sin abrir la bomba. Se infiere del tiempo acumulado fuera de la ventana del BEP y del aceite de la cámara con partículas.",
    ventanaDeTiempo: "Acumulativo. Cada hora fuera de ventana suma.",
    derivaEn: ["DA-12", "DA-04"],
  },

  "DA-04": {
    id: "DA-04",
    titulo: "Rotura del eje",
    tipo: "mecanico",
    gravedad: "terminal",
    queLePasaALaBomba:
      "El eje se parte por fatiga. El motor sigue girando pero ya no arrastra los impulsores.",
    comoSeDetecta:
      "El amperaje cae en seco y la presión desaparece con el motor todavía corriendo.",
    ventanaDeTiempo: "Instantáneo. Es el final, no una advertencia.",
    derivaEn: ["DA-17"],
  },

  "DA-05": {
    id: "DA-05",
    titulo: "Cavitación — picado de impulsores",
    tipo: "hidraulico",
    gravedad: "grave",
    queLePasaALaBomba:
      "El fluido llega con tan poca presión que hierve dentro de la bomba. Las burbujas implosionan contra el metal y le arrancan partículas.",
    comoSeDetecta:
      "Ruido de grava, caudal inestable y vibración, con presión de succión por debajo de lo normal.",
    ventanaDeTiempo: "Horas de daño acumulado e irreversible.",
    derivaEn: ["DA-10", "DA-12", "DA-07"],
  },

  "DA-06": {
    id: "DA-06",
    titulo: "Gas lock — bloqueo por aire o gas",
    tipo: "hidraulico",
    gravedad: "moderado",
    queLePasaALaBomba:
      "Una bolsa de aire entre las etapas impide que la bomba empuje fluido. Gira en vacío.",
    comoSeDetecta:
      "Parámetros normales en el variador y aun así sin presión ni caudal. Amperaje por debajo de lo habitual.",
    ventanaDeTiempo:
      "Minutos antes de comprometer el sello, que se queda sin lubricación.",
    derivaEn: ["DA-07", "DA-08"],
  },

  "DA-07": {
    id: "DA-07",
    titulo: "Falla del sello mecánico",
    tipo: "mecanico",
    gravedad: "grave",
    queLePasaALaBomba:
      "Las caras del sello se dañan y el fluido empieza a salir por donde el eje atraviesa la bomba.",
    comoSeDetecta: "Goteo o chorro por la zona del acople, olor y mancha en el skid.",
    ventanaDeTiempo:
      "Un goteo se puede vigilar un turno; un chorro obliga a parar.",
    derivaEn: ["DA-16", "DA-17"],
  },

  "DA-08": {
    id: "DA-08",
    titulo: "Recalentamiento y vaporización del fluido",
    tipo: "hidraulico",
    gravedad: "grave",
    queLePasaALaBomba:
      "Con caudal bajo o nulo, toda la potencia del motor se queda dentro de la bomba en forma de calor. El fluido se calienta hasta vaporizarse y el metal se dilata.",
    comoSeDetecta:
      "Cuerpo de la bomba caliente al tacto, presión buena y caudal bajo o nulo.",
    ventanaDeTiempo:
      "Minutos si la descarga está cerrada del todo. Es la condición que menos tiempo tolera la unidad.",
    derivaEn: ["DA-07", "DA-15", "DA-06"],
  },

  "DA-09": {
    id: "DA-09",
    titulo: "Erosión por sólidos",
    tipo: "mecanico",
    gravedad: "moderado",
    queLePasaALaBomba:
      "La arena que entra con el fluido lima impulsores, difusores y las caras del sello.",
    comoSeDetecta:
      "Caída lenta del head frente a la curva y sólidos acumulados en el strainer.",
    ventanaDeTiempo: "Meses. Es desgaste acumulado.",
    derivaEn: ["DA-10", "DA-07"],
  },

  "DA-10": {
    id: "DA-10",
    titulo: "Desgaste de etapas y anillos",
    tipo: "hidraulico",
    gravedad: "moderado",
    queLePasaALaBomba:
      "La bomba pierde sellado interno: parte del fluido se devuelve entre etapas en lugar de avanzar. Ya no alcanza su curva.",
    comoSeDetecta:
      "Head medido cayendo evaluación tras evaluación, y frecuencia equivalente cada vez más baja que la declarada.",
    ventanaDeTiempo: "Meses. Es el envejecimiento normal, acelerado por sólidos y cavitación.",
    derivaEn: ["DA-17"],
  },

  "DA-11": {
    id: "DA-11",
    titulo: "Sobrecarga o quemado del motor",
    tipo: "electrico",
    gravedad: "terminal",
    queLePasaALaBomba:
      "El motor entrega más potencia de la que tiene disponible y se calienta hasta dañar el aislamiento.",
    comoSeDetecta: "Amperaje por encima del nominal y alarmas de sobrecarga en el variador.",
    ventanaDeTiempo:
      "El variador lo protege si sus alarmas están activas. Con las alarmas anuladas, hasta que se quema.",
    derivaEn: ["DA-17"],
  },

  "DA-12": {
    id: "DA-12",
    titulo: "Vibración excesiva y fatiga",
    tipo: "mecanico",
    gravedad: "moderado",
    queLePasaALaBomba:
      "El movimiento anormal fatiga el eje, castiga rodamientos y afloja bridas y soportes de la tubería.",
    comoSeDetecta:
      "Se siente en el skid. Si cambia al cambiar el caudal, el origen es hidráulico; si no, es mecánico.",
    ventanaDeTiempo: "Días o semanas hasta la falla de un rodamiento o del eje.",
    derivaEn: ["DA-04", "DA-14", "DA-07"],
  },

  "DA-13": {
    id: "DA-13",
    titulo: "Sobrepresión — presión de trabajo superada",
    tipo: "hidraulico",
    gravedad: "grave",
    queLePasaALaBomba:
      "La carcasa, las bridas y el sello trabajan por encima de la presión para la que fueron diseñados.",
    comoSeDetecta:
      "Presión de descarga por encima del seteo de la VRP, o succión alta que se suma a una descarga ya alta.",
    ventanaDeTiempo: "Inmediato: es un riesgo de seguridad, no sólo de equipo.",
    derivaEn: ["DA-07", "DA-16"],
  },

  "DA-14": {
    id: "DA-14",
    titulo: "Falla de rodamientos de la cámara de empuje",
    tipo: "mecanico",
    gravedad: "grave",
    queLePasaALaBomba:
      "Los rodamientos que absorben el empuje pierden su película de aceite y empiezan a trabajar metal contra metal.",
    comoSeDetecta:
      "Temperatura alta en la cámara, aceite oscuro, lechoso o con partículas.",
    ventanaDeTiempo: "Días una vez que el aceite se degrada.",
    derivaEn: ["DA-04", "DA-15"],
  },

  "DA-15": {
    id: "DA-15",
    titulo: "Agarrotamiento del conjunto rotativo",
    tipo: "mecanico",
    gravedad: "terminal",
    queLePasaALaBomba:
      "Por dilatación térmica o por desgaste, las partes que giran rozan contra las fijas hasta trabarse.",
    comoSeDetecta: "Amperaje disparado y la unidad que no arranca o dispara al arrancar.",
    ventanaDeTiempo: "Instantáneo una vez que ocurre.",
    derivaEn: ["DA-04", "DA-11", "DA-17"],
  },

  "DA-16": {
    id: "DA-16",
    titulo: "Derrame de fluido",
    tipo: "ambiental",
    gravedad: "grave",
    queLePasaALaBomba:
      "El fluido sale del sistema: por el sello, por una brida o durante una maniobra de venteo mal hecha.",
    comoSeDetecta: "Charco o mancha en el skid, o alrededor de la unidad.",
    ventanaDeTiempo: "Reportable de inmediato.",
    derivaEn: ["DA-17"],
  },

  "DA-17": {
    id: "DA-17",
    titulo: "Parada no programada y pérdida de producción",
    tipo: "operativo",
    gravedad: "grave",
    queLePasaALaBomba:
      "La unidad sale de servicio sin haberlo previsto. El cliente deja de recibir el servicio contratado.",
    comoSeDetecta: "Unidad parada.",
    ventanaDeTiempo: "Es el resultado, no un proceso.",
  },

  "DA-18": {
    id: "DA-18",
    titulo: "Operación a ciegas",
    tipo: "operativo",
    gravedad: "moderado",
    queLePasaALaBomba:
      "No es un daño en sí: es quedarse sin el dato que permite saber si la bomba está sufriendo. Sin caudal confiable no se puede saber si hay upthrust ni si se cruzó el MCSF.",
    comoSeDetecta: "MC-II en cero o congelado, o manómetros que no coinciden entre sí.",
    ventanaDeTiempo:
      "Tolerable un turno con rondas frecuentes; más allá de eso se escala a Mantenimiento.",
    derivaEn: ["DA-01", "DA-02"],
  },
};

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

/**
 * @typedef {object} EmpujeAxial
 * @property {"upthrust"|"downthrust"|"variable"|"ninguno"} tipo
 * @property {"leve"|"moderado"|"severo"|"no aplica"} severidad
 * @property {string} porQue  Por qué ese evento carga la bomba en esa dirección.
 */

/**
 * @typedef {object} Evento
 * @property {string} id
 * @property {string} titulo
 * @property {"descarga"|"caudal"|"succion"|"electrico"|"instrumentacion"|"mecanico"|"proceso"} familia
 * @property {"causaRaiz"|"sintoma"|"falla"} rol   Dónde vive en el árbol.
 * @property {"informativa"|"vigilar"|"corregir"|"parar"} urgencia
 * @property {string} preguntaGuia  Cómo la plantearía el operador en radio.
 * @property {string} significado   Qué está pasando de verdad.
 * @property {string[]} causas      De más a menos probable.
 * @property {string[]} verificar   Qué mirar, en orden.
 * @property {string[]} acciones    Qué hacer, en orden.
 * @property {string[]} [noHagas]   Errores que empeoran el cuadro.
 * @property {EmpujeAxial} empujeAxial
 * @property {string[]} danos       IDs de DANOS.
 * @property {string[]} llevaA      IDs de eventos que este desencadena.
 * @property {string[]} provieneDe  IDs de eventos que lo causan.
 * @property {string[]} [glosario]  Claves del glosario.
 * @property {string} [correccion]  Aclaración de un malentendido frecuente.
 * @property {string} [escalar]     Cuándo dejar de intentarlo y llamar.
 */

/** @type {Record<string, Evento>} */
export const EVENTOS = {
  // ===== Familia: presión de descarga ======================================
  "EV-01": {
    id: "EV-01",
    titulo: "Presión de descarga alta",
    familia: "descarga",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿La descarga subió sin que hayas tocado la frecuencia?",
    significado:
      "El fluido está encontrando más resistencia de la normal para salir. O hay algo que lo frena aguas abajo, o la línea a la que descargas está más presurizada que tu bomba.",
    causas: [
      "Obstrucción aguas abajo: válvula cerrando, línea taponada, check pegado",
      "Escala o incrustación en la línea, en la turbina del medidor o dentro de las etapas",
      "Contrapresión del cabezal: si descargas a un manifold donde convergen otras bombas y ellas empujan más fuerte, tu fluido no logra entrar a la convergencia",
      "Presión de succión alta que se está sumando a la descarga",
      "VRP seteada por encima de lo que corresponde",
    ],
    verificar: [
      "Contrastar el transmisor contra el manómetro análogo",
      "Recorrer la línea aguas abajo y confirmar la posición de cada válvula",
      "Preguntar por la presión del cabezal y si las otras bombas cambiaron de régimen",
      "Confirmar que el MC-II está leyendo: sin caudal no se sabe de qué lado de la curva estás",
    ],
    acciones: [
      "Si hay obstrucción, liberarla antes de tocar la frecuencia",
      "Si la contrapresión del cabezal es la causa, coordinar con el cliente el régimen de las otras bombas",
      "Bajar frecuencia si hay que sostener la unidad mientras se resuelve",
    ],
    noHagas: [
      "Subir frecuencia para 'ganarle' a la contrapresión: sólo acerca la unidad a su presión máxima de trabajo",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "Más presión con el mismo o menos caudal desplaza el punto hacia la izquierda de la curva, que es donde el empuje carga hacia la succión.",
    },
    danos: ["DA-02", "DA-13", "DA-08", "DA-07"],
    llevaA: ["EV-04", "EV-08", "EV-15"],
    provieneDe: ["EV-21", "EV-23", "EV-24", "EV-11"],
    glosario: ["presionDescarga", "contrapresion", "cabezal", "vrp", "downthrust"],
  },

  "EV-02": {
    id: "EV-02",
    titulo: "Presión de descarga baja",
    familia: "descarga",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿La descarga bajó y el caudal sigue igual o subió?",
    significado:
      "La bomba no está logrando presurizar. O se está fugando el fluido, o la bomba ya no da lo que daba, o hay aire adentro.",
    causas: [
      "Fuga en la tubería aguas abajo",
      "Desgaste de etapas: la bomba perdió capacidad hidráulica",
      "Aire o gas atrapado dentro de la bomba",
      "Presión de succión insuficiente",
      "Frecuencia más baja de la que se cree",
      "Válvula de bypass abierta de más, o línea desviada",
    ],
    verificar: [
      "Recorrer toda la tubería aguas abajo buscando fuga: es lo primero, y es un tema de seguridad además de operación",
      "Contrastar el manómetro análogo contra el transmisor",
      "Confirmar la frecuencia real en el variador",
      "Revisar la posición del bypass",
    ],
    acciones: [
      "Si no hay fuga y sobra caudal, estrangular (chocar) el flujo aguas abajo para recuperar presión, poco a poco",
      "Vigilar que el caudal no baje del MCSF mientras estrangulas",
      "Si la presión no responde al estrangular, sospechar aire en la bomba o desgaste",
    ],
    noHagas: [
      "Estrangular de golpe: pasas de un extremo de la curva al otro y cambias upthrust por recirculación",
    ],
    empujeAxial: {
      tipo: "upthrust",
      severidad: "moderado",
      porQue:
        "Poca presión suele venir acompañada de caudal alto, y eso desplaza el punto a la derecha de la curva, donde el empuje se invierte hacia la descarga.",
    },
    danos: ["DA-01", "DA-10", "DA-16", "DA-17"],
    llevaA: ["EV-03", "EV-09"],
    provieneDe: ["EV-10", "EV-18", "EV-25", "EV-26", "EV-28"],
    glosario: ["presionDescarga", "estrangular", "mcsf", "upthrust", "desgasteDeEtapas"],
  },

  // ===== Familia: caudal ===================================================
  "EV-03": {
    id: "EV-03",
    titulo: "Caudal muy alto con presión baja",
    familia: "caudal",
    rol: "sintoma",
    urgencia: "parar",
    preguntaGuia: "¿El caudal se disparó y la presión se cayó?",
    significado:
      "La bomba se quedó sin nada que la frene y está entregando mucho más caudal del que le corresponde. Es el extremo derecho de la curva, la zona de runout.",
    causas: [
      "Las bombas que aportan al mismo cabezal están fuera de servicio, así que desapareció la contrapresión que sostenía tu punto",
      "Válvula de descarga demasiado abierta o VRP mal seteada",
      "Ruptura de línea aguas abajo",
      "Lectura de caudal errónea: medidor descalibrado",
    ],
    verificar: [
      "Confirmar con el cliente el estado de las otras bombas del cabezal",
      "Contrastar la lectura del caudalímetro antes de actuar sobre una lectura falsa",
      "Revisar la posición de la válvula de descarga y el seteo de la VRP",
      "Recorrer la línea buscando ruptura",
    ],
    acciones: [
      "Bajar frecuencia de inmediato para devolver el caudal al rango de la curva",
      "Estrangular la descarga para recuperar contrapresión",
      "Vigilar el amperaje mientras corriges: en esta zona el motor está pidiendo más potencia de la normal",
    ],
    noHagas: [
      "Dejar la unidad así 'mientras se resuelve': es la condición que más rápido destruye una HPS",
    ],
    empujeAxial: {
      tipo: "upthrust",
      severidad: "severo",
      porQue:
        "Con caudal por encima del rango los impulsores se levantan de su apoyo normal y quedan golpeando contra el lado de descarga. Es el empuje que más rápido consume arandelas y fatiga el eje.",
    },
    danos: ["DA-01", "DA-03", "DA-12", "DA-05", "DA-11", "DA-04"],
    llevaA: ["EV-08", "EV-13", "EV-17", "EV-20"],
    provieneDe: ["EV-02", "EV-23", "EV-25", "EV-19"],
    glosario: ["runout", "upthrust", "contrapresion", "cabezal", "npsh"],
    escalar:
      "Si no puedes recuperar contrapresión bajando frecuencia ni estrangulando, para la unidad y avisa antes de que el daño sea mecánico.",
  },

  "EV-04": {
    id: "EV-04",
    titulo: "Caudal bajo con presión alta",
    familia: "caudal",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿El caudal bajó mientras la presión subía?",
    significado:
      "Hay una constricción aguas abajo. La bomba está empujando contra algo que no la deja pasar y se corrió a la zona izquierda de la curva.",
    causas: [
      "Restricción aguas abajo: válvula cerrando o línea parcialmente taponada",
      "Turbina del medidor tapada, que además de no medir se convierte en una restricción real",
      "Escala acumulada en la línea o dentro de la bomba",
      "Estrangulamiento excesivo hecho a propósito para subir presión",
    ],
    verificar: [
      "Revisar el diferencial de presión a través del medidor",
      "Confirmar la posición de las válvulas aguas abajo",
      "Comparar el amperaje con el histórico: si viene subiendo desde hace semanas, es escala",
    ],
    acciones: [
      "Abrir la descarga hasta devolver el caudal por encima del MCSF",
      "Programar limpieza de la turbina o de la línea si se confirma taponamiento",
      "Si el caudal no se recupera al abrir, la restricción es interna: escalar a Mantenimiento",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "Poco caudal y mucha presión es la izquierda de la curva: los impulsores cargan contra el lado de succión con más fuerza de la prevista.",
    },
    danos: ["DA-02", "DA-03", "DA-08", "DA-14"],
    llevaA: ["EV-05", "EV-08", "EV-15"],
    provieneDe: ["EV-01", "EV-21", "EV-24"],
    glosario: ["downthrust", "mcsf", "turbina", "escala"],
  },

  "EV-05": {
    id: "EV-05",
    titulo: "Sin caudal con buena presión (recirculación)",
    familia: "caudal",
    rol: "falla",
    urgencia: "parar",
    preguntaGuia:
      "¿Tienes buena presión pero el caudal está en cero o casi, y el cuerpo de la bomba se está calentando?",
    significado:
      "El fluido está dando vueltas dentro de la bomba sin lograr salir. No consigue vencer la presión de la línea para entrar a la convergencia del flujo, así que toda la energía del motor se queda adentro convertida en calor.",
    causas: [
      "Descarga cerrada o casi cerrada",
      "Presión del cabezal por encima de lo que la bomba puede vencer",
      "Check de descarga pegado",
      "Obstrucción total aguas abajo",
    ],
    verificar: [
      "Tocar el cuerpo de la bomba: la temperatura subiendo por encima de lo normal confirma la recirculación",
      "Comparar la presión de descarga contra la del cabezal",
      "Confirmar que el caudal cero es real y no un MC-II caído",
    ],
    acciones: [
      "Abrir la descarga o bajar frecuencia de inmediato para restablecer caudal",
      "Si la presión del cabezal es la que bloquea, coordinar con el cliente",
      "Si no se puede restablecer caudal en minutos, parar la unidad",
    ],
    noHagas: [
      "Sostener la unidad en esta condición esperando que 'entre' el flujo: la bomba se está cocinando por dentro",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "severo",
      porQue:
        "Con la descarga cerrada la bomba está en su punto de máxima presión y caudal cero, que es el extremo izquierdo de la curva. Ahí el empuje hacia la succión es el máximo posible.",
    },
    correccion:
      "Este caso es downthrust severo, no upthrust. El upthrust es la situación contraria: caudal excesivo y presión baja (ver EV-03). Se confunden fácil porque los dos son 'fuera de rango', pero el daño y la corrección son opuestos.",
    danos: ["DA-02", "DA-08", "DA-07", "DA-15", "DA-06", "DA-03"],
    llevaA: ["EV-13", "EV-15", "EV-16", "EV-18", "EV-20"],
    provieneDe: ["EV-04", "EV-19", "EV-23", "EV-24"],
    glosario: ["recirculacion", "shutOff", "downthrust", "recalentamiento", "mcsf"],
    escalar: "Si la temperatura sigue subiendo con la descarga ya abierta, para y llama.",
  },

  "EV-06": {
    id: "EV-06",
    titulo: "Caudal normal con presión de descarga muy alta",
    familia: "caudal",
    rol: "sintoma",
    urgencia: "vigilar",
    preguntaGuia: "¿El caudal está donde siempre pero la descarga está altísima?",
    significado:
      "Si el caudal es el de siempre, la bomba está trabajando igual que siempre. Entonces la presión de más no la está poniendo la bomba: viene de la succión, o el instrumento está mintiendo.",
    causas: [
      "Presión de succión fuera de rango, demasiado alta, que se suma a la descarga",
      "Transmisor de descarga descalibrado",
      "Alarmas bypasseadas que estaban ocultando la condición desde un turno anterior",
    ],
    verificar: [
      "Leer la succión y compararla con su rango normal",
      "Contrastar el transmisor contra el manómetro análogo",
      "Revisar si hay alarmas en bypass en el panel o en el variador",
    ],
    acciones: [
      "Si la succión es la causa, tratarla como EV-11",
      "Si el instrumento es la causa, corregir la lectura antes de tomar cualquier decisión operativa",
    ],
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue:
        "Con el caudal en su rango normal el punto sigue dentro de la ventana de la curva, así que el empuje no cambia. El riesgo aquí es de presión, no de empuje.",
    },
    danos: ["DA-13", "DA-07", "DA-18"],
    llevaA: ["EV-16"],
    provieneDe: ["EV-11"],
    glosario: ["manometroAnalogo", "bypassDeAlarmas", "presionSuccion"],
  },

  "EV-07": {
    id: "EV-07",
    titulo: "Caudal bajo y presión baja a la vez",
    familia: "caudal",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿Bajaron las dos cosas al mismo tiempo?",
    significado:
      "Cuando caen las dos, el problema casi nunca está aguas abajo: a la bomba no le está llegando lo que necesita, o ya no puede con lo que le llega.",
    causas: [
      "Strainer sucio",
      "Presión de succión insuficiente",
      "Aire o gas dentro de la bomba",
      "Desgaste severo de etapas",
      "Frecuencia más baja de la que se cree",
    ],
    verificar: [
      "Leer la presión de succión y el diferencial del strainer",
      "Confirmar que la booster está trabajando",
      "Confirmar la frecuencia en el variador",
    ],
    acciones: [
      "Limpiar el strainer si el diferencial lo confirma",
      "Si la succión está bien y el strainer limpio, ventear la bomba por los capilares",
      "Si nada de eso lo explica, contrastar el punto contra la curva: puede ser desgaste",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "Con caudal por debajo del rango el punto se corre a la izquierda de la curva, aunque la presión también esté baja.",
    },
    danos: ["DA-02", "DA-05", "DA-10"],
    llevaA: ["EV-15"],
    provieneDe: ["EV-10", "EV-12", "EV-18", "EV-26"],
    glosario: ["strainer", "presionSuccion", "gasLock", "desgasteDeEtapas"],
  },

  // ===== Familia: succión ==================================================
  "EV-10": {
    id: "EV-10",
    titulo: "Presión de succión baja",
    familia: "succion",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿La succión está por debajo de su rango normal?",
    significado:
      "A la bomba no le está llegando fluido con la presión que necesita. Si baja lo suficiente, el fluido hierve dentro de la bomba y empieza la cavitación.",
    causas: [
      "Bomba booster apagada o fallando",
      "Strainer sucio",
      "El cliente no está entregando el fluido necesario",
      "Nivel bajo en el tanque o el pulmón",
      "Válvula de succión parcialmente cerrada",
    ],
    verificar: [
      "Confirmar el funcionamiento de la bomba booster: es lo primero",
      "Revisar el diferencial del strainer",
      "Confirmar nivel y aporte del lado del cliente",
      "Escuchar la bomba: ruido de grava es cavitación en curso",
    ],
    acciones: [
      "Restablecer la booster si está caída",
      "Limpiar el strainer si el diferencial lo confirma",
      "Bajar frecuencia mientras se resuelve: a menos caudal, menos presión de succión necesita la bomba",
    ],
    noHagas: ["Subir frecuencia para 'jalar' más fluido: agrava la cavitación"],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "leve",
      porQue:
        "La succión baja arrastra el caudal hacia abajo y con él el punto hacia la izquierda. El riesgo principal aquí no es el empuje sino la cavitación.",
    },
    danos: ["DA-05", "DA-06", "DA-07", "DA-10"],
    llevaA: ["EV-02", "EV-07", "EV-17", "EV-18"],
    provieneDe: ["EV-12", "EV-14", "EV-27"],
    glosario: ["presionSuccion", "bombaBooster", "strainer", "cavitacion", "npsh"],
  },

  "EV-11": {
    id: "EV-11",
    titulo: "Presión de succión alta",
    familia: "succion",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿La succión está por encima de su rango normal?",
    significado:
      "Te está llegando más presión de la que la unidad necesita. Esa presión se suma íntegra a la descarga y se la come el sello mecánico.",
    causas: [
      "El cliente está entregando con más presión de la acordada",
      "Booster sobredimensionada para el régimen actual",
      "La HPS está tomando menos caudal del que le llega, así que la presión se acumula en la succión",
      "Bypass cerrado",
    ],
    verificar: [
      "Comparar succión y descarga contra la presión máxima de trabajo de la unidad",
      "Revisar el estado del bypass",
      "Confirmar la lectura contra el manómetro análogo",
    ],
    acciones: [
      "Si puedes subir frecuencia manteniendo una presión de descarga segura, súbela: al tomar más caudal, la succión baja sola. Es la opción preferida.",
      "Si ya no queda margen de frecuencia, aperturar levemente la válvula de bypass",
      "Coordinar con el cliente si el exceso viene de su lado",
    ],
    noHagas: [
      "Abrir el bypass de golpe: el fluido empieza a recircular y se calienta",
      "Subir frecuencia sin mirar la descarga: puedes cambiar un problema de succión por una sobrepresión",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "leve",
      porQue:
        "La presión de succión alta empuja el conjunto rotativo hacia la descarga y descarga algo el apoyo normal, pero mientras el caudal siga en rango el empuje sigue siendo el de diseño. El daño real aquí es sobre el sello.",
    },
    danos: ["DA-07", "DA-13", "DA-16"],
    llevaA: ["EV-01", "EV-06", "EV-16"],
    provieneDe: [],
    glosario: ["presionSuccion", "selloMecanico", "bypass", "frecuencia"],
  },

  "EV-12": {
    id: "EV-12",
    titulo: "Strainer sucio u obstruido",
    familia: "succion",
    rol: "causaRaiz",
    urgencia: "corregir",
    preguntaGuia:
      "¿La succión sigue baja a pesar de tener la bomba booster encendida?",
    significado:
      "La canasta se llenó de sólidos y está ahogando la entrada de la bomba. Todo lo que pase por ahí llega con menos presión de la que debería.",
    causas: [
      "Acumulación normal de sólidos con el tiempo",
      "Aumento de arena en el fluido del cliente",
      "Limpieza vencida en el programa de mantenimiento",
    ],
    verificar: [
      "Medir el diferencial de presión entre los dos lados del strainer",
      "Comparar con el registro de la última limpieza",
    ],
    acciones: [
      "Programar y ejecutar la limpieza del strainer",
      "Mientras tanto, bajar frecuencia para reducir la exigencia de succión",
      "Si sale mucha arena, avisar al cliente: el origen está en su fluido",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "leve",
      porQue: "Restringe el caudal disponible y corre el punto hacia la izquierda de la curva.",
    },
    danos: ["DA-05", "DA-09"],
    llevaA: ["EV-07", "EV-10", "EV-17"],
    provieneDe: ["EV-22"],
    glosario: ["strainer", "solidos", "presionSuccion"],
  },

  "EV-14": {
    id: "EV-14",
    titulo: "El cliente no está entregando fluido",
    familia: "succion",
    rol: "causaRaiz",
    urgencia: "corregir",
    preguntaGuia:
      "¿Sigues sin presión de succión aunque el strainer está limpio y la booster trabajando?",
    significado:
      "El problema ya no es tuyo: no está llegando fluido a la unidad. Tanque vacío, línea del cliente cerrada o aporte interrumpido aguas arriba.",
    causas: [
      "Tanque o pulmón del cliente vacío o en nivel mínimo",
      "Válvula del cliente cerrada",
      "Aporte de pozos interrumpido",
    ],
    verificar: [
      "Confirmar nivel del tanque con el operador del cliente",
      "Recorrer la línea de succión hasta el punto de entrega",
    ],
    acciones: [
      "Parar la unidad antes de que trabaje en seco",
      "Dejar constancia y coordinar la reanudación con el cliente",
    ],
    noHagas: [
      "Mantener la bomba corriendo 'a ver si llega': trabajar en seco destruye el sello en minutos",
    ],
    empujeAxial: {
      tipo: "variable",
      severidad: "severo",
      porQue:
        "Sin fluido no hay punto de operación estable: la bomba oscila entre vacío y golpes de caudal, y el empuje cambia de sentido con cada oscilación.",
    },
    danos: ["DA-06", "DA-07", "DA-08", "DA-03", "DA-17"],
    llevaA: ["EV-09", "EV-10", "EV-16", "EV-18"],
    provieneDe: [],
    glosario: ["presionSuccion", "selloMecanico", "gasLock"],
  },

  "EV-27": {
    id: "EV-27",
    titulo: "Falla de la bomba booster",
    familia: "succion",
    rol: "causaRaiz",
    urgencia: "corregir",
    preguntaGuia: "¿La booster está encendida y realmente entregando?",
    significado:
      "Sin booster, la HPS se queda sin el colchón de presión que necesita en la entrada. Es una de las causas más frecuentes de succión baja.",
    causas: [
      "Booster apagada o disparada",
      "Falla eléctrica en su arrancador",
      "Booster cavitando o con su propio problema de succión",
    ],
    verificar: [
      "Confirmar que está corriendo y que su descarga sube",
      "Revisar su arrancador y sus protecciones",
    ],
    acciones: [
      "Restablecer la booster",
      "Bajar frecuencia de la HPS mientras tanto",
      "Si no arranca, escalar a Mantenimiento",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "leve",
      porQue: "Su falla arrastra el caudal hacia abajo por falta de aporte en la succión.",
    },
    danos: ["DA-05", "DA-06"],
    llevaA: ["EV-10", "EV-17"],
    provieneDe: [],
    glosario: ["bombaBooster", "presionSuccion"],
  },

  // ===== Familia: eléctrico ================================================
  "EV-08": {
    id: "EV-08",
    titulo: "Amperaje alto",
    familia: "electrico",
    rol: "sintoma",
    urgencia: "parar",
    preguntaGuia: "¿El amperaje está por encima de lo normal para esta frecuencia?",
    significado:
      "Al motor le está costando más de lo normal mover la bomba. Algo aumentó la carga: escala, sólidos, roce mecánico o demasiado caudal.",
    causas: [
      "Escala o incrustación acumulada: la causa más común cuando el amperaje viene subiendo desde hace semanas",
      "Sólidos o arena dentro de la bomba",
      "Roce mecánico por desgaste o por dilatación térmica",
      "Caudal excesivo: en la zona de runout el motor pide bastante más potencia",
      "Fluido más denso que el declarado",
      "Problema eléctrico: desbalance de fases o aislamiento",
    ],
    verificar: [
      "Comparar contra el histórico: subida lenta apunta a escala, subida brusca a roce o a un cambio de proceso",
      "Confirmar caudal y presión para saber dónde está el punto en la curva",
      "Revisar si hay alarmas del variador en bypass",
    ],
    acciones: [
      "Bajar frecuencia para reducir carga mientras se diagnostica",
      "Si el punto está en runout, corregir la contrapresión (ver EV-03)",
      "Si se confirma escala, programar la limpieza con Mantenimiento",
    ],
    noHagas: [
      "Desactivar o bypassear las alarmas del variador para que la unidad no dispare. Esa alarma es lo único que está entre un amperaje alto y un eje partido o un motor quemado.",
    ],
    empujeAxial: {
      tipo: "variable",
      severidad: "moderado",
      porQue:
        "El amperaje alto no define por sí solo el empuje: hay que mirar el caudal. Con caudal alto es upthrust; con caudal bajo y presión alta es downthrust por escala o restricción.",
    },
    danos: ["DA-11", "DA-04", "DA-15", "DA-12"],
    llevaA: ["EV-20"],
    provieneDe: ["EV-01", "EV-03", "EV-04", "EV-21", "EV-22"],
    glosario: ["amperaje", "escala", "variador", "bypassDeAlarmas", "potencia"],
    escalar:
      "Si el amperaje sigue subiendo con la frecuencia ya reducida, para la unidad y llama a Mantenimiento.",
  },

  "EV-09": {
    id: "EV-09",
    titulo: "Amperaje bajo o caído de golpe",
    familia: "electrico",
    rol: "sintoma",
    urgencia: "parar",
    preguntaGuia: "¿El amperaje cayó de golpe con el motor todavía corriendo?",
    significado:
      "El motor dejó de tener carga. O la bomba no tiene qué bombear, o ya no está conectada al motor.",
    causas: [
      "Eje partido o acople roto: si además desapareció la presión, es lo primero que hay que descartar",
      "Gas lock: la bomba gira sin empujar nada",
      "Falta de fluido en la succión",
    ],
    verificar: [
      "Mirar presión y caudal al mismo tiempo: sin presión y sin caudal con el motor corriendo es eje partido hasta que se demuestre lo contrario",
      "Revisar succión y nivel de aporte",
    ],
    acciones: [
      "Parar la unidad si se sospecha eje partido: seguir girando sólo suma daño",
      "Si es gas lock, ventear por los capilares con un balde debajo",
      "Escalar a Mantenimiento",
    ],
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue: "Sin carga hidráulica no hay empuje que administrar. El daño, si lo hay, ya ocurrió.",
    },
    danos: ["DA-04", "DA-06", "DA-07", "DA-17"],
    llevaA: ["EV-20"],
    provieneDe: ["EV-02", "EV-14", "EV-18"],
    glosario: ["amperaje", "eje", "gasLock"],
  },

  // ===== Familia: instrumentación ==========================================
  "EV-19": {
    id: "EV-19",
    titulo: "MC-II sin señal de caudal",
    familia: "instrumentacion",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿El MC-II está en cero o congelado aunque la bomba está entregando?",
    significado:
      "El computador de flujo dejó de recibir los pulsos del pick-up. La bomba puede estar perfecta, pero te quedaste sin el dato que te dice de qué lado de la curva estás.",
    causas: [
      "Pick-up sucio en la punta",
      "Conexión turbina–pick-up sucia o con óxido",
      "Cables sueltos o sin contacto",
      "Pick-up mal roscado a la turbina, demasiado lejos del rotor",
      "Pick-up defectuoso",
      "Problema de alimentación del MC-II",
    ],
    verificar: [
      "Limpiar el pick-up y su conexión con la turbina",
      "Revisar cable por cable que no haya ninguno sin contacto",
      "Confirmar que el pick-up está bien atornillado a la turbina y a la distancia correcta del rotor",
      "Confirmar alimentación del equipo",
    ],
    acciones: [
      "Seguir esos cuatro pasos en ese orden: limpieza, cables, ajuste, alimentación",
      "Mientras no haya caudal, estimar el punto con presión y frecuencia y hacer rondas más seguidas",
      "Si después de todo eso el MC-II sigue sin responder, contactar a Mantenimiento lo antes posible para sostener una operación segura y de excelencia con el cliente",
    ],
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue:
        "El evento no carga la bomba. El riesgo es indirecto y serio: sin caudal no puedes saber si estás en upthrust o si cruzaste el MCSF, así que un daño de empuje puede avanzar sin que nadie lo vea.",
    },
    danos: ["DA-18"],
    llevaA: ["EV-03", "EV-05"],
    provieneDe: ["EV-21", "EV-22"],
    glosario: ["mcII", "pickUp", "turbina", "caudal"],
    escalar:
      "Si tras limpiar, revisar cables y confirmar el ajuste del pick-up sigue sin señal, es tema de Mantenimiento. No se sigue interviniendo el equipo.",
  },

  "EV-23": {
    id: "EV-23",
    titulo: "Bombas del cabezal fuera de servicio o en otro régimen",
    familia: "proceso",
    rol: "causaRaiz",
    urgencia: "corregir",
    preguntaGuia: "¿Cambió algo en las otras bombas que descargan al mismo cabezal?",
    significado:
      "Tu punto de operación depende de lo que hagan las demás. Si se apagan, te quedas sin contrapresión y te vas a caudal excesivo; si suben presión, tu fluido no logra entrar a la convergencia.",
    causas: [
      "Otras bombas del cabezal fuera de servicio",
      "Otras bombas subieron régimen y ahora dominan el cabezal",
      "Cambio de alineación de líneas del lado del cliente",
    ],
    verificar: [
      "Confirmar con el cliente el estado y el régimen de las demás unidades",
      "Comparar tu presión de descarga contra la del cabezal",
    ],
    acciones: [
      "Ajustar frecuencia para reacomodar tu punto al nuevo escenario del cabezal",
      "Coordinar el régimen con el cliente en lugar de compensarlo con frecuencia",
    ],
    empujeAxial: {
      tipo: "variable",
      severidad: "severo",
      porQue:
        "Según hacia dónde cambie el cabezal: si desaparece contrapresión, upthrust; si te bloquean la descarga, downthrust y recirculación.",
    },
    danos: ["DA-01", "DA-02", "DA-08"],
    llevaA: ["EV-01", "EV-03", "EV-05"],
    provieneDe: [],
    glosario: ["cabezal", "contrapresion", "upthrust", "downthrust"],
  },

  // ===== Familia: mecánico =================================================
  "EV-13": {
    id: "EV-13",
    titulo: "Vibración alta",
    familia: "mecanico",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia: "¿La unidad está vibrando más de lo normal?",
    significado:
      "La vibración es siempre un síntoma. Lo importante es de dónde viene, y para eso basta una prueba: cambiar el caudal y ver si cambia.",
    causas: [
      "Upthrust: los impulsores están repiqueteando",
      "Cavitación",
      "Recirculación por caudal por debajo del MCSF",
      "Desalineación del acople",
      "Pernos de anclaje o soportes flojos",
      "Rodamientos gastados",
    ],
    verificar: [
      "Cambiar el caudal y observar: si la vibración cambia, el origen es hidráulico; si no cambia, es mecánico",
      "Revisar anclajes y el estado del acople",
      "Tomar temperatura de la cámara de empuje",
    ],
    acciones: [
      "Si es hidráulica, devolver el punto a la ventana del BEP",
      "Si es mecánica, escalar a Mantenimiento: no se corrige operando",
    ],
    empujeAxial: {
      tipo: "variable",
      severidad: "moderado",
      porQue:
        "Cuando el origen es hidráulico, la vibración es la manifestación audible del empuje mal administrado.",
    },
    danos: ["DA-12", "DA-04", "DA-14", "DA-07"],
    llevaA: ["EV-16", "EV-20"],
    provieneDe: ["EV-03", "EV-05", "EV-17"],
    glosario: ["vibracion", "acople", "upthrust", "cavitacion"],
  },

  "EV-15": {
    id: "EV-15",
    titulo: "Temperatura alta en el cuerpo o en la cámara de empuje",
    familia: "mecanico",
    rol: "sintoma",
    urgencia: "parar",
    preguntaGuia: "¿El cuerpo de la bomba o la cámara están más calientes que de costumbre?",
    significado:
      "El calor sobrante siempre sale de lo mismo: energía que entró y no salió como caudal. Es la confirmación física de que la bomba está trabajando donde no debe.",
    causas: [
      "Recirculación o caudal por debajo del MCSF",
      "Descarga cerrada o casi cerrada",
      "Nivel bajo o aceite degradado en la cámara de empuje",
      "Roce mecánico",
    ],
    verificar: [
      "Confirmar caudal real y compararlo con el MCSF",
      "Revisar nivel y aspecto del aceite de la cámara: lechoso es agua, oscuro es recalentamiento, con partículas ya es metal",
    ],
    acciones: [
      "Restablecer caudal de inmediato",
      "Si la temperatura no cede, parar la unidad",
      "Programar cambio de aceite si está degradado",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "severo",
      porQue:
        "El calor viene casi siempre de operar con poco o ningún caudal, que es justo la zona de máximo downthrust.",
    },
    danos: ["DA-08", "DA-14", "DA-07", "DA-15"],
    llevaA: ["EV-16", "EV-20"],
    provieneDe: ["EV-01", "EV-04", "EV-05", "EV-07", "EV-21"],
    glosario: ["recalentamiento", "camaraDeEmpuje", "recirculacion", "mcsf"],
  },

  "EV-16": {
    id: "EV-16",
    titulo: "Fuga por el sello mecánico",
    familia: "mecanico",
    rol: "falla",
    urgencia: "parar",
    preguntaGuia: "¿Hay goteo o chorro por la zona donde el eje sale de la bomba?",
    significado:
      "Las caras del sello ya no están sellando. Empieza como goteo y termina como chorro, y por el camino es un derrame.",
    causas: [
      "Presión de succión por encima de lo que el sello aguanta",
      "Funcionamiento en seco o con gas lock",
      "Recalentamiento",
      "Sólidos rayando las caras",
      "Vibración",
    ],
    verificar: [
      "Cuantificar la fuga: gotas por minuto contra chorro continuo",
      "Revisar presión de succión y temperatura",
      "Buscar la causa aguas arriba: el sello es la víctima, no el culpable",
    ],
    acciones: [
      "Corregir la causa: bajar succión, restablecer caudal, ventear si hay gas",
      "Contener el derrame",
      "Si es chorro, parar y escalar",
    ],
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue: "Es una consecuencia, no una causa de empuje.",
    },
    danos: ["DA-07", "DA-16", "DA-17"],
    llevaA: ["EV-20"],
    provieneDe: ["EV-05", "EV-06", "EV-11", "EV-13", "EV-14", "EV-15", "EV-17", "EV-18", "EV-22"],
    glosario: ["selloMecanico", "presionSuccion", "gasLock"],
  },

  "EV-17": {
    id: "EV-17",
    titulo: "Cavitación",
    familia: "mecanico",
    rol: "falla",
    urgencia: "parar",
    preguntaGuia: "¿Suena como si la bomba estuviera moviendo grava?",
    significado:
      "El fluido está hirviendo dentro de la bomba porque llega con muy poca presión, y las burbujas implosionan contra el metal. Cada implosión se lleva un pedacito de impulsor.",
    causas: [
      "Presión de succión insuficiente",
      "Strainer sucio",
      "Booster caída",
      "Caudal excesivo: en runout la bomba necesita mucha más presión de succión",
    ],
    verificar: [
      "Leer la succión y compararla con lo que la bomba necesita a ese caudal",
      "Revisar strainer y booster",
    ],
    acciones: [
      "Bajar frecuencia: a menos caudal, menos presión de succión requiere la bomba",
      "Restablecer el aporte de succión",
      "No sostener la condición: el daño es acumulado y no se recupera",
    ],
    empujeAxial: {
      tipo: "variable",
      severidad: "moderado",
      porQue:
        "Suele venir acompañada de caudal inestable, y con él el empuje oscila en lugar de mantenerse en una dirección.",
    },
    danos: ["DA-05", "DA-10", "DA-12", "DA-07"],
    llevaA: ["EV-13", "EV-16", "EV-26"],
    provieneDe: ["EV-03", "EV-10", "EV-12", "EV-27"],
    glosario: ["cavitacion", "npsh", "presionSuccion", "runout"],
  },

  "EV-18": {
    id: "EV-18",
    titulo: "Aire o gas dentro de la bomba (gas lock)",
    familia: "mecanico",
    rol: "sintoma",
    urgencia: "corregir",
    preguntaGuia:
      "¿Los parámetros del variador están normales pero aun así no tienes presión ni caudal?",
    significado:
      "Hay una bolsa de aire atrapada entre las etapas. La bomba gira como si todo estuviera bien, pero no logra empujar nada.",
    causas: [
      "Arranque sin cebar correctamente",
      "Entrada de aire por succión con nivel muy bajo",
      "Gas liberado del propio fluido",
      "Intervención reciente en la línea de succión",
    ],
    verificar: [
      "Confirmar que el variador marca frecuencia y amperaje normales o algo bajos",
      "Confirmar que succión y descarga no responden",
    ],
    acciones: [
      "Ventear la bomba por medio de sus capilares hasta que salga fluido limpio y continuo",
      "Usar un balde para recoger, y evitar el derrame",
      "Si vuelve a ocurrir, buscar por dónde está entrando el aire en la succión",
    ],
    noHagas: [
      "Insistir con la bomba corriendo sin ventear: mientras está en gas lock el sello trabaja sin lubricación",
    ],
    empujeAxial: {
      tipo: "variable",
      severidad: "moderado",
      porQue:
        "Con bolsas de gas el caudal aparece y desaparece, y el empuje cambia de sentido en cada oscilación.",
    },
    danos: ["DA-06", "DA-07", "DA-08"],
    llevaA: ["EV-02", "EV-07", "EV-09", "EV-16"],
    provieneDe: ["EV-05", "EV-10", "EV-14"],
    glosario: ["gasLock", "venteo", "selloMecanico"],
  },

  "EV-20": {
    id: "EV-20",
    titulo: "Rotura del eje",
    familia: "mecanico",
    rol: "falla",
    urgencia: "parar",
    preguntaGuia:
      "¿El motor sigue girando pero desapareció la presión y el amperaje cayó en seco?",
    significado:
      "El eje se partió. La bomba ya no está siendo arrastrada por el motor. Es una falla terminal y es el final de una historia larga.",
    causas: [
      "Upthrust sostenido: la causa más frecuente",
      "Escala acumulada, sobre todo al arrancar contra una bomba incrustada",
      "Vibración crónica no corregida",
      "Alarmas del variador anuladas que dejaron pasar una sobrecarga",
    ],
    verificar: ["Confirmar que no es un problema de instrumentación antes de declararlo"],
    acciones: [
      "Parar la unidad de inmediato",
      "Escalar a Mantenimiento",
      "Recuperar el histórico de amperaje, caudal y presión: ahí está la causa",
    ],
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue: "Es el resultado del empuje mal administrado, no una condición de empuje.",
    },
    danos: ["DA-04", "DA-17"],
    llevaA: [],
    provieneDe: ["EV-03", "EV-05", "EV-08", "EV-09", "EV-13", "EV-15", "EV-16", "EV-21"],
    glosario: ["roturaDeEje", "eje", "upthrust", "escala"],
  },

  "EV-28": {
    id: "EV-28",
    titulo: "Rotación invertida",
    familia: "mecanico",
    rol: "causaRaiz",
    urgencia: "parar",
    preguntaGuia:
      "¿Es el primer arranque después de una intervención eléctrica y la unidad da mucho menos de lo que debería?",
    significado:
      "El motor está girando al revés. La bomba entrega algo de presión, pero muy por debajo de su curva, y con amperaje bajo.",
    causas: ["Fases invertidas tras una intervención en el arrancador o en el variador"],
    verificar: [
      "Confirmar el sentido de giro contra la flecha del equipo",
      "Comparar el punto contra la curva: mucho menos head del esperado con amperaje bajo",
    ],
    acciones: ["Parar y corregir el sentido de giro antes de seguir operando"],
    empujeAxial: {
      tipo: "variable",
      severidad: "moderado",
      porQue: "El empuje no sigue el patrón de diseño porque el flujo dentro de las etapas es anómalo.",
    },
    danos: ["DA-10", "DA-03"],
    llevaA: ["EV-02", "EV-26"],
    provieneDe: [],
    glosario: ["eje", "curvaDeFabrica"],
  },

  // ===== Familia: proceso ==================================================
  "EV-21": {
    id: "EV-21",
    titulo: "Escala o incrustación",
    familia: "proceso",
    rol: "causaRaiz",
    urgencia: "vigilar",
    preguntaGuia: "¿El amperaje viene subiendo semana a semana sin que hayas cambiado nada?",
    significado:
      "Se está formando depósito mineral duro dentro de la bomba, del medidor y de la línea. Avanza despacio, y por eso se detecta comparando con el histórico, no con la lectura de hoy.",
    causas: [
      "Química del fluido del cliente",
      "Tratamiento químico insuficiente o suspendido",
      "Cambios de temperatura y presión que precipitan el mineral",
    ],
    verificar: [
      "Revisar la tendencia de amperaje, caudal y presión de las últimas semanas",
      "Revisar el programa de tratamiento químico con el cliente",
    ],
    acciones: [
      "Reportar la tendencia antes de que se vuelva una restricción",
      "Coordinar limpieza química o mecánica con Mantenimiento",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "moderado",
      porQue:
        "La incrustación estrangula el paso, así que baja el caudal y sube la presión: el punto se corre a la izquierda de la curva.",
    },
    danos: ["DA-02", "DA-11", "DA-15", "DA-04"],
    llevaA: ["EV-01", "EV-04", "EV-08", "EV-15", "EV-19", "EV-20"],
    provieneDe: [],
    glosario: ["escala", "amperaje", "turbina"],
  },

  "EV-22": {
    id: "EV-22",
    titulo: "Sólidos o arena en el fluido",
    familia: "proceso",
    rol: "causaRaiz",
    urgencia: "vigilar",
    preguntaGuia: "¿Está saliendo más arena de lo normal en el strainer?",
    significado:
      "El fluido del cliente trae partículas. Tapan el strainer, liman los impulsores y rayan las caras del sello.",
    causas: [
      "Producción de arena en los pozos del cliente",
      "Limpieza o intervención reciente aguas arriba",
      "Falla en la separación previa",
    ],
    verificar: [
      "Revisar la cantidad de sólidos en cada limpieza de strainer",
      "Comparar contra limpiezas anteriores",
    ],
    acciones: [
      "Acortar el intervalo de limpieza del strainer",
      "Reportar al cliente: el origen está en su fluido, no en la unidad",
    ],
    empujeAxial: {
      tipo: "ninguno",
      severidad: "no aplica",
      porQue: "Es un agente de desgaste; el empuje lo definen el caudal y la presión.",
    },
    danos: ["DA-09", "DA-07", "DA-10"],
    llevaA: ["EV-08", "EV-12", "EV-16", "EV-19", "EV-26"],
    provieneDe: [],
    glosario: ["solidos", "strainer", "selloMecanico"],
  },

  "EV-24": {
    id: "EV-24",
    titulo: "Obstrucción aguas abajo",
    familia: "proceso",
    rol: "causaRaiz",
    urgencia: "corregir",
    preguntaGuia: "¿Hay alguna válvula cerrando, un check pegado o algo taponado en la línea?",
    significado:
      "Algo mecánico está frenando el paso del fluido después de la bomba. Es la explicación más directa de una presión de descarga alta con caudal bajo.",
    causas: [
      "Válvula parcialmente o totalmente cerrada",
      "Check de descarga pegado",
      "Línea taponada",
      "Cierre brusco que además provocó golpe de ariete",
    ],
    verificar: [
      "Recorrer la línea confirmando posición de cada válvula",
      "Revisar el check de descarga",
    ],
    acciones: [
      "Liberar la obstrucción antes de tocar la frecuencia",
      "Maniobrar las válvulas despacio para no provocar golpe de ariete",
    ],
    empujeAxial: {
      tipo: "downthrust",
      severidad: "severo",
      porQue:
        "Es la causa directa de la condición de válvula cerrada, donde el downthrust llega a su máximo.",
    },
    danos: ["DA-02", "DA-08", "DA-13"],
    llevaA: ["EV-01", "EV-04", "EV-05"],
    provieneDe: [],
    glosario: ["aguasArribaAbajo", "golpeDeAriete", "shutOff"],
  },

  "EV-25": {
    id: "EV-25",
    titulo: "Fuga en la línea de descarga",
    familia: "proceso",
    rol: "causaRaiz",
    urgencia: "parar",
    preguntaGuia: "¿La presión se cayó y el caudal se disparó al mismo tiempo?",
    significado:
      "El fluido está saliendo por donde no debe. Además del riesgo ambiental, la bomba se queda sin contrapresión y se va a caudal excesivo.",
    causas: ["Ruptura de línea", "Brida o empaque fallando", "Corrosión"],
    verificar: [
      "Recorrer toda la tubería aguas abajo de la unidad",
      "Contrastar caudal entregado contra caudal recibido por el cliente",
    ],
    acciones: [
      "Parar la unidad y aislar el tramo",
      "Reportar el derrame según procedimiento",
    ],
    empujeAxial: {
      tipo: "upthrust",
      severidad: "severo",
      porQue:
        "Al desaparecer la contrapresión el caudal se dispara y la bomba se va al extremo derecho de la curva.",
    },
    danos: ["DA-16", "DA-01", "DA-17"],
    llevaA: ["EV-02", "EV-03"],
    provieneDe: [],
    glosario: ["contrapresion", "upthrust", "presionDescarga"],
  },

  "EV-26": {
    id: "EV-26",
    titulo: "Desgaste de etapas",
    familia: "proceso",
    rol: "falla",
    urgencia: "vigilar",
    preguntaGuia:
      "¿El head medido viene cayendo poco a poco frente a la curva, evaluación tras evaluación?",
    significado:
      "La bomba perdió sellado interno y ya no alcanza su curva de fábrica. Es envejecimiento, acelerado por sólidos y por cavitación.",
    causas: [
      "Horas de operación acumuladas",
      "Sólidos en el fluido",
      "Cavitación sostenida",
      "Tiempo acumulado fuera de la ventana del BEP",
    ],
    verificar: [
      "Comparar el head medido contra la curva a lo largo del histórico",
      "Revisar la frecuencia equivalente: si baja con el tiempo, es desgaste",
    ],
    acciones: [
      "Documentar la tendencia y proyectar el cambio de la unidad",
      "Corregir las causas que lo aceleran: sólidos, cavitación, operación fuera de ventana",
    ],
    empujeAxial: {
      tipo: "upthrust",
      severidad: "leve",
      porQue:
        "Una bomba desgastada da menos presión al mismo caudal, así que el punto se corre hacia la derecha de la curva.",
    },
    danos: ["DA-10", "DA-17"],
    llevaA: ["EV-02", "EV-07"],
    provieneDe: ["EV-17", "EV-22", "EV-28"],
    glosario: ["desgasteDeEtapas", "curvaDeFabrica", "frecuenciaEquivalente"],
  },
};

// ---------------------------------------------------------------------------
// Matriz de síntomas — el atajo de radio
// ---------------------------------------------------------------------------

/**
 * Combinaciones de lecturas y a qué evento apuntan. Es lo que un operador
 * consulta primero: "tengo esto y esto, ¿qué miro?".
 * Valores admitidos: "alta" | "normal" | "baja" | "nula" | "cualquiera".
 */
export const MATRIZ_SINTOMAS = [
  {
    patron: { descarga: "alta", caudal: "baja" },
    evento: "EV-04",
    empuje: "downthrust",
    lectura: "Constricción aguas abajo. Turbina tapada o escala.",
  },
  {
    patron: { descarga: "alta", caudal: "normal" },
    evento: "EV-06",
    empuje: "ninguno",
    lectura: "Mira la succión y el manómetro análogo antes que nada.",
  },
  {
    patron: { descarga: "alta", caudal: "nula" },
    evento: "EV-05",
    empuje: "downthrust",
    lectura: "Recirculación. Toca el cuerpo de la bomba: si está caliente, confirma.",
  },
  {
    patron: { descarga: "baja", caudal: "alta" },
    evento: "EV-03",
    empuje: "upthrust",
    lectura: "Te quedaste sin contrapresión. Es la condición más urgente de todas.",
  },
  {
    patron: { descarga: "baja", caudal: "baja" },
    evento: "EV-07",
    empuje: "downthrust",
    lectura: "El problema está aguas arriba: strainer, succión o aire en la bomba.",
  },
  {
    patron: { descarga: "baja", caudal: "normal" },
    evento: "EV-02",
    empuje: "upthrust",
    lectura: "Busca fuga aguas abajo antes de estrangular.",
  },
  {
    patron: { descarga: "nula", caudal: "nula", amperaje: "normal" },
    evento: "EV-18",
    empuje: "variable",
    lectura: "Aire dentro de la bomba. Ventea por los capilares.",
  },
  {
    patron: { descarga: "nula", caudal: "nula", amperaje: "baja" },
    evento: "EV-09",
    empuje: "ninguno",
    lectura: "Sospecha eje partido. Para la unidad.",
  },
  {
    patron: { succion: "baja" },
    evento: "EV-10",
    empuje: "downthrust",
    lectura: "Booster primero, strainer después, cliente al final.",
  },
  {
    patron: { succion: "alta" },
    evento: "EV-11",
    empuje: "downthrust",
    lectura: "Sube Hz si el margen de descarga lo permite; si no, abre el bypass levemente.",
  },
  {
    patron: { amperaje: "alta" },
    evento: "EV-08",
    empuje: "variable",
    lectura: "Mira el caudal para saber si es upthrust o escala. Nunca anules la alarma.",
  },
  {
    patron: { caudal: "nula", descarga: "cualquiera", instrumentacion: "sospechosa" },
    evento: "EV-19",
    empuje: "ninguno",
    lectura: "Confirma que el cero es real antes de tratarlo como problema hidráulico.",
  },
];

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export const FAMILIAS = {
  descarga: { titulo: "Presión de descarga", color: "#c2410c" },
  caudal: { titulo: "Caudal", color: "#0369a1" },
  succion: { titulo: "Presión de succión", color: "#0f766e" },
  electrico: { titulo: "Eléctrico", color: "#a16207" },
  instrumentacion: { titulo: "Instrumentación", color: "#6d28d9" },
  mecanico: { titulo: "Mecánico", color: "#be123c" },
  proceso: { titulo: "Proceso y línea", color: "#4d7c0f" },
};

export const URGENCIAS = {
  informativa: { titulo: "Informativa", orden: 0 },
  vigilar: { titulo: "Vigilar", orden: 1 },
  corregir: { titulo: "Corregir en este turno", orden: 2 },
  parar: { titulo: "Corregir ya o parar", orden: 3 },
};

/** Un evento por ID. */
export function evento(id) {
  return EVENTOS[id];
}

/** Todos los eventos de una familia. */
export function eventosDeFamilia(familia) {
  return Object.values(EVENTOS).filter((e) => e.familia === familia);
}

/** Recorre el árbol hacia adelante: todo lo que este evento puede desencadenar. */
export function cadenaDeEfectos(id, { profundidad = Infinity } = {}) {
  return recorrer(id, "llevaA", profundidad);
}

/** Recorre el árbol hacia atrás: todo lo que pudo haber causado este evento. */
export function cadenaDeCausas(id, { profundidad = Infinity } = {}) {
  return recorrer(id, "provieneDe", profundidad);
}

function recorrer(id, campo, profundidad) {
  const vistos = new Set();
  const salida = [];
  let frente = [id];
  let nivel = 0;
  while (frente.length && nivel < profundidad) {
    const siguiente = [];
    for (const actual of frente) {
      for (const vecino of EVENTOS[actual]?.[campo] ?? []) {
        if (vistos.has(vecino)) continue;
        vistos.add(vecino);
        salida.push({ id: vecino, salto: nivel + 1, desde: actual });
        siguiente.push(vecino);
      }
    }
    frente = siguiente;
    nivel += 1;
  }
  return salida;
}

/** Todos los daños que un evento puede acarrear, incluidos los derivados. */
export function danosDe(id, { incluirDerivados = true } = {}) {
  const directos = EVENTOS[id]?.danos ?? [];
  if (!incluirDerivados) return directos.map((d) => DANOS[d]).filter(Boolean);
  const vistos = new Set(directos);
  const cola = [...directos];
  while (cola.length) {
    const actual = cola.shift();
    for (const derivado of DANOS[actual]?.derivaEn ?? []) {
      if (vistos.has(derivado)) continue;
      vistos.add(derivado);
      cola.push(derivado);
    }
  }
  return [...vistos].map((d) => DANOS[d]).filter(Boolean);
}

/**
 * Busca en la matriz de síntomas. Se le pasa lo que el operador está viendo y
 * devuelve los eventos candidatos, del más específico al más general.
 *
 * @example buscarPorSintomas({ descarga: "baja", caudal: "alta" })
 */
export function buscarPorSintomas(lectura = {}) {
  const puntuar = (patron) => {
    let aciertos = 0;
    for (const [clave, valor] of Object.entries(patron)) {
      if (valor === "cualquiera") continue;
      if (lectura[clave] === undefined) return -1;
      if (lectura[clave] !== valor) return -1;
      aciertos += 1;
    }
    return aciertos;
  };
  return MATRIZ_SINTOMAS.map((fila) => ({ ...fila, aciertos: puntuar(fila.patron) }))
    .filter((fila) => fila.aciertos > 0)
    .sort((a, b) => b.aciertos - a.aciertos)
    .map((fila) => ({ ...fila, detalle: EVENTOS[fila.evento] }));
}

/** Comprueba que el árbol es coherente. Devuelve la lista de problemas. */
export function verificarIntegridad() {
  const problemas = [];
  for (const [id, ev] of Object.entries(EVENTOS)) {
    if (id !== ev.id) problemas.push(`${id}: la clave no coincide con el campo id (${ev.id})`);
    for (const d of ev.danos ?? [])
      if (!DANOS[d]) problemas.push(`${id}: daño inexistente ${d}`);
    for (const destino of ev.llevaA ?? []) {
      if (!EVENTOS[destino]) {
        problemas.push(`${id}: llevaA apunta a un evento inexistente ${destino}`);
      } else if (!(EVENTOS[destino].provieneDe ?? []).includes(id)) {
        problemas.push(`${id} → ${destino}: falta la arista inversa en provieneDe`);
      }
    }
    for (const origen of ev.provieneDe ?? []) {
      if (!EVENTOS[origen]) {
        problemas.push(`${id}: provieneDe apunta a un evento inexistente ${origen}`);
      } else if (!(EVENTOS[origen].llevaA ?? []).includes(id)) {
        problemas.push(`${origen} → ${id}: falta la arista directa en llevaA`);
      }
    }
    if (!FAMILIAS[ev.familia]) problemas.push(`${id}: familia desconocida ${ev.familia}`);
    if (!URGENCIAS[ev.urgencia]) problemas.push(`${id}: urgencia desconocida ${ev.urgencia}`);
  }
  for (const [id, d] of Object.entries(DANOS)) {
    for (const der of d.derivaEn ?? [])
      if (!DANOS[der]) problemas.push(`${id}: derivaEn apunta a un daño inexistente ${der}`);
  }
  return problemas;
}

/** Texto plano de los eventos, para inyectar como contexto al modelo. */
export function eventosParaPrompt({ ids = null } = {}) {
  const l = ["EVENTOS DE CAMPO — HPS", ""];
  for (const ev of Object.values(EVENTOS)) {
    if (ids && !ids.includes(ev.id)) continue;
    l.push(`### ${ev.id} — ${ev.titulo} [${ev.familia} / ${ev.urgencia}]`);
    l.push(`Pregunta guía: ${ev.preguntaGuia}`);
    l.push(`Significado: ${ev.significado}`);
    l.push(`Causas: ${ev.causas.join("; ")}.`);
    l.push(`Verificar: ${ev.verificar.join("; ")}.`);
    l.push(`Acciones: ${ev.acciones.join("; ")}.`);
    if (ev.noHagas?.length) l.push(`No hagas: ${ev.noHagas.join("; ")}.`);
    l.push(
      `Empuje axial: ${ev.empujeAxial.tipo} (${ev.empujeAxial.severidad}). ${ev.empujeAxial.porQue}`
    );
    l.push(
      `Daños posibles: ${(ev.danos ?? [])
        .map((d) => `${d} ${DANOS[d]?.titulo ?? ""}`)
        .join("; ")}.`
    );
    if (ev.llevaA?.length) l.push(`Lleva a: ${ev.llevaA.join(", ")}.`);
    if (ev.correccion) l.push(`Aclaración: ${ev.correccion}`);
    if (ev.escalar) l.push(`Escalar: ${ev.escalar}`);
    l.push("");
  }
  return l.join("\n").trim();
}

export const diccionarioEventos = {
  eventos: EVENTOS,
  danos: DANOS,
  familias: FAMILIAS,
  urgencias: URGENCIAS,
  matrizSintomas: MATRIZ_SINTOMAS,
  evento,
  eventosDeFamilia,
  cadenaDeEfectos,
  cadenaDeCausas,
  danosDe,
  buscarPorSintomas,
  verificarIntegridad,
  eventosParaPrompt,
};

export default diccionarioEventos;
