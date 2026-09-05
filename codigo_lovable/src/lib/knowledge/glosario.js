/**
 * HPS-DOOM — Glosario.
 *
 * Vocabulario mínimo que el modelo (y el operador nuevo) necesita entender
 * antes de leer una consideración o un evento. Cada entrada está escrita para
 * que se pueda leer en voz alta en locación: primero qué es, después cómo se
 * ve en campo, y sólo al final el matiz técnico.
 *
 * No hay fórmulas aquí. Las fórmulas viven en evaluacion.js (MAGNITUDES).
 *
 * Convención de campos:
 *   titulo        Nombre completo, con el sinónimo de campo si lo tiene.
 *   definicion    Qué es. Dos frases como máximo.
 *   enCampo       Cómo se manifiesta o dónde se mide. Lo que el operador ve.
 *   nota          Matiz que evita un malentendido común. Opcional.
 *   relacionados  Otras claves de este mismo glosario.
 *   eventos       IDs de eventos.js donde el término es protagonista.
 */

/**
 * @typedef {object} Termino
 * @property {string} titulo
 * @property {string} definicion
 * @property {string} [enCampo]
 * @property {string} [nota]
 * @property {string[]} [relacionados]
 * @property {string[]} [eventos]
 */

// ---------------------------------------------------------------------------
// 1. La curva y el punto de operación
// ---------------------------------------------------------------------------

/** @type {Record<string, Termino>} */
export const GLOSARIO_CURVA = {
  head: {
    titulo: "Head diferencial",
    definicion:
      "Presión que la bomba le añade al fluido, en psi. En campo se mide como presión de descarga menos presión de succión.",
    enCampo:
      "Si la descarga marca 1 800 psi y la succión 60 psi, el head es 1 740 psi. Es lo único que la bomba realmente aporta.",
    nota: "Se expresa en psi y no en pies porque las curvas de estas unidades vienen en psi para una densidad concreta.",
    relacionados: ["presionDescarga", "presionSuccion", "densidad"],
  },

  curvaDeFabrica: {
    titulo: "Curva de fábrica",
    definicion:
      "Relación head–caudal que el fabricante garantiza para la bomba a una velocidad dada, con agua limpia y la bomba nueva.",
    enCampo:
      "Es la referencia contra la que se compara todo lo demás. Si el punto medido cae por debajo, la bomba ya no da lo que daba.",
    nota: "Una bomba desgastada queda por debajo de su curva; ninguna bomba la supera de forma sostenida.",
    relacionados: ["bep", "mcsf", "runout", "leyesDeAfinidad"],
  },

  leyesDeAfinidad: {
    titulo: "Leyes de afinidad",
    definicion:
      "Reglas que permiten trasladar una curva de una velocidad a otra: el caudal escala con la frecuencia, el head con la frecuencia al cuadrado y la potencia con la frecuencia al cubo.",
    enCampo:
      "Por eso basta guardar una sola curva de 60 Hz por bomba: cualquier otra frecuencia se calcula a partir de ella.",
    nota: "Contrastado contra las curvas multi-velocidad de fábrica, el error máximo es de 4 psi.",
    relacionados: ["frecuencia", "curvaDeFabrica"],
  },

  bep: {
    titulo: "BEP — punto de mejor eficiencia",
    definicion:
      "Caudal al que la bomba alcanza su máxima eficiencia hidráulica. La ventana sana de operación va del 70 % al 120 % de ese caudal.",
    enCampo:
      "Es el punto donde la bomba está más cómoda: menos vibración, menos empuje axial y menos consumo por barril.",
    nota: "Operar lejos del BEP no rompe la bomba de inmediato, pero le acorta la vida por cargas radiales y por empuje axial.",
    relacionados: ["empujeAxial", "upthrust", "downthrust", "eficiencia"],
  },

  mcsf: {
    titulo: "MCSF — caudal mínimo continuo estable",
    definicion:
      "Caudal por debajo del cual la bomba no debe trabajar de forma sostenida. Por debajo de él aparece recirculación interna, vibración y calentamiento del fluido.",
    enCampo:
      "Es el piso. Estrangular la descarga para subir presión es válido, pero nunca hasta cruzar el MCSF.",
    nota: "Escala linealmente con la frecuencia, igual que el resto de caudales.",
    relacionados: ["recirculacion", "downthrust", "estrangular"],
    eventos: ["EV-04", "EV-05"],
  },

  runout: {
    titulo: "Runout — extremo derecho de la curva",
    definicion:
      "Zona de caudal muy alto y head muy bajo. La potencia que pide la bomba se dispara y necesita mucha más presión de succión para no cavitar.",
    enCampo:
      "Se llega ahí cuando la descarga se queda sin contrapresión: una línea rota, una válvula muy abierta o el resto de bombas del cabezal fuera de servicio.",
    nota: "Es la zona donde aparece el upthrust, el empuje que más rápido destruye una bomba.",
    relacionados: ["upthrust", "cavitacion", "contrapresion"],
    eventos: ["EV-03"],
  },

  frecuenciaEquivalente: {
    titulo: "Frecuencia equivalente",
    definicion:
      "Frecuencia cuya curva de fábrica pasa exactamente por el punto que se midió en campo.",
    enCampo:
      "Si el variador dice 55 Hz pero el punto cae sobre la curva de 50 Hz, o el variador no está donde se cree, o la bomba ya perdió capacidad.",
    nota: "Por sí sola es un diagnóstico, no una alarma: primero se confirma el variador.",
    relacionados: ["frecuencia", "desgasteDeEtapas", "curvaDeFabrica"],
  },

  eficiencia: {
    titulo: "Eficiencia hidráulica",
    definicion:
      "Porcentaje de la energía del eje que termina convertida en presión útil. El resto se va en calor y en turbulencia.",
    enCampo:
      "Cae rápido a medida que el punto se aleja del BEP. Una eficiencia baja se paga en amperaje y en temperatura.",
    relacionados: ["bep", "potencia"],
  },

  potencia: {
    titulo: "Potencia al eje",
    definicion:
      "Caballos que el motor tiene que entregar para sostener ese caudal y ese head con ese fluido.",
    enCampo:
      "Se refleja directo en el amperaje del variador. Si sube sin que hayas cambiado nada, algo cambió en la hidráulica o hay roce mecánico.",
    relacionados: ["amperaje", "variador", "densidad"],
    eventos: ["EV-08"],
  },

  densidad: {
    titulo: "Densidad / gravedad específica",
    definicion:
      "Cuánto pesa el fluido comparado con el agua. Entra en el cálculo de presión y de potencia.",
    enCampo:
      "Un fluido más pesado da más psi para el mismo head en pies, y pide más amperaje. Un fluido más ligero, lo contrario.",
    nota: "Si la densidad declarada no es la real, el punto se compara contra una curva que no corresponde.",
    relacionados: ["head", "potencia"],
  },
};

// ---------------------------------------------------------------------------
// 2. Empuje axial — el corazón de por qué importa dónde operas
// ---------------------------------------------------------------------------

/** @type {Record<string, Termino>} */
export const GLOSARIO_EMPUJE = {
  empujeAxial: {
    titulo: "Empuje axial",
    definicion:
      "Fuerza que empuja al conjunto rotativo a lo largo del eje, hacia la succión o hacia la descarga. Cada impulsor la genera y su dirección depende de dónde estés operando en la curva.",
    enCampo:
      "No se mide con un manómetro: se deduce del caudal. Por eso, si el MC-II no lee caudal, estás operando sin saber cómo está cargada la bomba.",
    nota: "Quien absorbe ese empuje es la cámara de empuje y las arandelas de cada etapa. Son piezas de desgaste: se consumen.",
    relacionados: ["upthrust", "downthrust", "camaraDeEmpuje", "arandelasDeEmpuje", "bep"],
    eventos: ["EV-03", "EV-04", "EV-05"],
  },

  downthrust: {
    titulo: "Downthrust — empuje hacia la succión",
    definicion:
      "Empuje que aparece cuando la bomba trabaja con poco caudal y mucha presión, es decir a la izquierda del BEP. Los impulsores se apoyan contra sus arandelas del lado de la succión.",
    enCampo:
      "Es la condición normal de trabajo: toda bomba está diseñada para llevar algo de downthrust. El problema es el exceso, y el exceso viene de estrangular de más, de una obstrucción aguas abajo o de operar con la descarga casi cerrada.",
    nota: "El downthrust severo desgasta arandelas y sobrecarga la cámara de empuje, pero avisa: sube la temperatura y baja el caudal antes de romper nada.",
    relacionados: ["upthrust", "arandelasDeEmpuje", "mcsf", "recirculacion", "shutOff"],
    eventos: ["EV-01", "EV-04", "EV-05"],
  },

  upthrust: {
    titulo: "Upthrust — empuje hacia la descarga",
    definicion:
      "Empuje que aparece cuando la bomba entrega mucho más caudal del que le corresponde y muy poca presión, es decir a la derecha del BEP y hacia el runout. Los impulsores se levantan de su apoyo normal y golpean del lado contrario.",
    enCampo:
      "Se produce cuando la descarga se queda sin contrapresión: línea rota, válvula demasiado abierta, VRP mal seteada o las bombas del cabezal fuera de servicio.",
    nota: "Es el más destructivo de los dos. El impulsor deja de apoyarse y empieza a repiquetear: las arandelas se consumen en horas, la vibración se dispara y de ahí sale la mayoría de los ejes partidos. Si se detecta, se corrige de inmediato.",
    relacionados: ["downthrust", "runout", "arandelasDeEmpuje", "roturaDeEje", "contrapresion"],
    eventos: ["EV-02", "EV-03"],
  },

  camaraDeEmpuje: {
    titulo: "Cámara de empuje (thrust chamber)",
    definicion:
      "Conjunto de rodamientos, lleno de aceite, que absorbe el empuje axial que le llega del eje y evita que el conjunto rotativo se desplace.",
    enCampo:
      "Se vigila por temperatura y por el estado del aceite: si está lechoso entró agua, si está oscuro se recalentó, si trae partículas ya hay metal desgastándose.",
    relacionados: ["empujeAxial", "arandelasDeEmpuje", "eje"],
    eventos: ["EV-15", "EV-21"],
  },

  arandelasDeEmpuje: {
    titulo: "Arandelas de empuje (thrust washers)",
    definicion:
      "Piezas de desgaste sobre las que se apoya cada impulsor dentro de su etapa. Hay una para el lado de succión y otra para el de descarga.",
    enCampo:
      "No se ven sin desarmar la bomba. Su desgaste se infiere del tiempo que la unidad pasó fuera de la ventana del BEP.",
    nota: "Están diseñadas para trabajar en downthrust moderado. En upthrust se consumen muchísimo más rápido.",
    relacionados: ["upthrust", "downthrust", "etapa"],
  },
};

// ---------------------------------------------------------------------------
// 3. Partes de la unidad
// ---------------------------------------------------------------------------

/** @type {Record<string, Termino>} */
export const GLOSARIO_UNIDAD = {
  hps: {
    titulo: "HPS — sistema de bombeo horizontal",
    definicion:
      "Bomba centrífuga multietapa montada en horizontal sobre un skid, acoplada a un motor eléctrico y gobernada por un variador de frecuencia.",
    enCampo:
      "El tren completo es: bomba booster → strainer → succión → bomba HPS → descarga → medidor de caudal → cabezal del cliente.",
    relacionados: ["bombaBooster", "strainer", "variador", "cabezal"],
  },

  etapa: {
    titulo: "Etapa (impulsor + difusor)",
    definicion:
      "Cada par impulsor-difusor de la bomba. El impulsor gira y le da velocidad al fluido; el difusor la convierte en presión.",
    enCampo:
      "Cuantas más etapas, más presión. El caudal lo define el diseño del impulsor, no el número de etapas.",
    relacionados: ["desgasteDeEtapas", "arandelasDeEmpuje"],
  },

  eje: {
    titulo: "Eje",
    definicion:
      "Barra que transmite el giro del motor a todos los impulsores.",
    enCampo:
      "Cuando se parte, el amperaje cae de golpe y la presión desaparece aunque el motor siga girando. Es una falla terminal.",
    nota: "Casi nunca se parte de un solo golpe: se fatiga por upthrust sostenido, por vibración o por el esfuerzo de arrancar contra una bomba escalada.",
    relacionados: ["upthrust", "escala", "vibracion"],
    eventos: ["EV-09", "EV-20"],
  },

  selloMecanico: {
    titulo: "Sello mecánico",
    definicion:
      "Par de caras pulidas que impiden que el fluido se escape por donde el eje sale de la bomba. Se lubrican y se enfrían con el mismo fluido bombeado.",
    enCampo:
      "Es la pieza más sensible de la unidad. Un goteo constante por la zona del acople es un sello empezando a fallar.",
    nota: "Lo matan tres cosas: trabajar en seco, la presión de succión por encima de lo que aguanta, y los sólidos.",
    relacionados: ["presionSuccion", "gasLock", "solidos"],
    eventos: ["EV-11", "EV-16", "EV-18"],
  },

  bombaBooster: {
    titulo: "Bomba booster",
    definicion:
      "Bomba pequeña que alimenta la succión de la HPS y le garantiza la presión mínima que necesita para no cavitar.",
    enCampo:
      "Si la succión está baja, lo primero es confirmar que la booster está encendida y entregando.",
    relacionados: ["presionSuccion", "cavitacion", "strainer"],
    eventos: ["EV-10", "EV-27"],
  },

  strainer: {
    titulo: "Strainer (filtro de succión)",
    definicion:
      "Canasta que retiene sólidos antes de que entren a la bomba.",
    enCampo:
      "Cuando se tapa, la succión cae aunque la booster esté trabajando bien, y el caudal baja con ella. Se confirma con el diferencial de presión entre sus dos lados.",
    nota: "Es la primera cosa que se revisa ante una succión baja con booster encendida.",
    relacionados: ["presionSuccion", "solidos", "cavitacion"],
    eventos: ["EV-12"],
  },

  variador: {
    titulo: "Variador de frecuencia (VFD)",
    definicion:
      "Equipo que fija la velocidad del motor cambiando la frecuencia de alimentación, y que además protege a la unidad con alarmas de sobrecarga y de baja carga.",
    enCampo:
      "Es la pantalla donde se leen Hz, amperaje y las alarmas activas.",
    nota: "Sus alarmas son la última línea de defensa del equipo. Anularlas para mantener la unidad corriendo convierte una parada de una hora en un cambio de bomba.",
    relacionados: ["frecuencia", "amperaje", "bypassDeAlarmas"],
    eventos: ["EV-08"],
  },

  acople: {
    titulo: "Acople y alineación",
    definicion:
      "Pieza que une el eje del motor con el de la bomba. La alineación es lo bien centrados que están esos dos ejes entre sí.",
    enCampo:
      "Una desalineación se siente como vibración que no cambia aunque cambies el caudal.",
    relacionados: ["vibracion", "eje"],
    eventos: ["EV-13"],
  },
};

// ---------------------------------------------------------------------------
// 4. Instrumentación
// ---------------------------------------------------------------------------

/** @type {Record<string, Termino>} */
export const GLOSARIO_INSTRUMENTOS = {
  presionSuccion: {
    titulo: "Presión de succión",
    definicion: "Presión con la que el fluido llega a la entrada de la bomba.",
    enCampo:
      "Demasiado baja, la bomba cavita. Demasiado alta, castiga el sello mecánico y se suma a la presión de descarga.",
    relacionados: ["bombaBooster", "strainer", "cavitacion", "selloMecanico"],
    eventos: ["EV-10", "EV-11"],
  },

  presionDescarga: {
    titulo: "Presión de descarga",
    definicion: "Presión con la que la bomba entrega el fluido a la línea.",
    enCampo:
      "Alta suele significar obstrucción o contrapresión del cabezal; baja suele significar fuga, desgaste o aire dentro de la bomba.",
    relacionados: ["contrapresion", "vrp", "head"],
    eventos: ["EV-01", "EV-02"],
  },

  caudal: {
    titulo: "Caudal",
    definicion: "Volumen de fluido que pasa por unidad de tiempo, en barriles por día.",
    enCampo:
      "Es el dato que dice en qué parte de la curva estás, y por lo tanto si tienes upthrust o downthrust. Sin caudal confiable no hay diagnóstico.",
    relacionados: ["turbina", "mcII", "empujeAxial"],
    eventos: ["EV-19"],
  },

  frecuencia: {
    titulo: "Frecuencia (Hz)",
    definicion: "Velocidad de giro que el variador le impone al motor.",
    enCampo:
      "Es la palanca principal del operador: subir Hz sube caudal y presión; bajarlos, lo contrario.",
    relacionados: ["variador", "leyesDeAfinidad"],
  },

  amperaje: {
    titulo: "Amperaje",
    definicion: "Corriente que consume el motor. Es el reflejo directo de cuánto esfuerzo le está costando mover la bomba.",
    enCampo:
      "Alto: escala, sólidos, roce o exceso de caudal. Bajo de golpe: eje partido, gas lock o falta de fluido.",
    relacionados: ["potencia", "escala", "eje", "variador"],
    eventos: ["EV-08", "EV-09"],
  },

  mcII: {
    titulo: "MC-II",
    definicion:
      "Computador de flujo que toma la señal del pick-up y la convierte en el caudal que ve el operador.",
    enCampo:
      "Si no recibe señal, la pantalla se queda en cero o congelada aunque la bomba esté entregando.",
    nota: "Un MC-II caído no es sólo un problema de reporte: sin caudal no se puede saber si la bomba está en upthrust.",
    relacionados: ["pickUp", "turbina", "caudal"],
    eventos: ["EV-19"],
  },

  pickUp: {
    titulo: "Pick-up",
    definicion:
      "Sensor magnético roscado sobre la turbina del medidor. Cuenta las vueltas del rotor y le manda los pulsos al MC-II.",
    enCampo:
      "Falla por suciedad en la punta, por cables sin contacto o por quedar mal roscado, demasiado lejos del rotor.",
    relacionados: ["mcII", "turbina"],
    eventos: ["EV-19"],
  },

  turbina: {
    titulo: "Turbina (medidor de caudal)",
    definicion:
      "Medidor con un rotor interno que gira en proporción al caudal que pasa por él.",
    enCampo:
      "Si se tapa con escala o sólidos, además de dejar de medir se convierte en una restricción real: sube la presión de descarga y baja el caudal.",
    relacionados: ["pickUp", "escala", "solidos"],
    eventos: ["EV-04", "EV-19"],
  },

  manometroAnalogo: {
    titulo: "Manómetro análogo",
    definicion: "Reloj mecánico de presión instalado en la unidad.",
    enCampo:
      "Es el juez cuando se duda del transmisor. Ante una lectura rara, se compara siempre contra el análogo antes de tomar cualquier acción.",
    relacionados: ["presionDescarga", "presionSuccion"],
    eventos: ["EV-06", "EV-23"],
  },

  bypassDeAlarmas: {
    titulo: "Bypass de alarmas",
    definicion:
      "Práctica de anular temporalmente una alarma del variador o del panel para que la unidad no dispare.",
    enCampo:
      "A veces está puesto de un turno anterior y nadie lo sabe. Ante cualquier lectura fuera de rango se revisa si hay alarmas bypasseadas.",
    nota: "Anular una alarma no resuelve la causa: sólo quita el aviso. Una alarma de sobrecarga anulada es, casi siempre, el paso previo a un eje partido o un motor quemado.",
    relacionados: ["variador", "amperaje"],
    eventos: ["EV-06", "EV-08"],
  },
};

// ---------------------------------------------------------------------------
// 5. Proceso, línea y modos de falla
// ---------------------------------------------------------------------------

/** @type {Record<string, Termino>} */
export const GLOSARIO_PROCESO = {
  aguasArribaAbajo: {
    titulo: "Aguas arriba / aguas abajo",
    definicion:
      "Aguas arriba es todo lo que está antes de la bomba (tanque del cliente, booster, strainer, succión). Aguas abajo es todo lo que viene después (descarga, medidor, válvulas, cabezal).",
    enCampo:
      "Regla práctica: los problemas de presión de succión se buscan aguas arriba; los de presión de descarga, aguas abajo.",
  },

  contrapresion: {
    titulo: "Contrapresión",
    definicion:
      "Resistencia que la línea le opone a la bomba. Es lo que sostiene la presión de descarga.",
    enCampo:
      "Si desaparece (línea rota, válvula muy abierta, bombas del cabezal apagadas), el caudal se dispara y la bomba se va a upthrust.",
    relacionados: ["upthrust", "runout", "vrp", "cabezal"],
    eventos: ["EV-03"],
  },

  cabezal: {
    titulo: "Cabezal / manifold / pulmón",
    definicion:
      "Punto donde el flujo de varias bombas converge en una sola línea.",
    enCampo:
      "Manda la bomba que más presión tenga. Si las demás empujan más fuerte que la tuya, tu fluido no entra a la convergencia; si las demás se apagan, tu bomba se queda sin contrapresión.",
    relacionados: ["contrapresion", "presionDescarga"],
    eventos: ["EV-01", "EV-03", "EV-23"],
  },

  vrp: {
    titulo: "Válvula reguladora de presión (VRP)",
    definicion:
      "Válvula que fija la contrapresión de descarga de la unidad. Su seteo determina la presión de descarga máxima admisible.",
    enCampo:
      "Mal seteada por lo alto, la unidad puede superar su presión de trabajo; mal seteada por lo bajo, la bomba se va a caudal excesivo.",
    relacionados: ["contrapresion", "presionDescarga", "upthrust"],
  },

  estrangular: {
    titulo: "Estrangular / chocar el flujo",
    definicion:
      "Cerrar parcialmente una válvula aguas abajo para aumentar la presión de descarga a costa de bajar el caudal.",
    enCampo:
      "Es la maniobra correcta cuando la presión está baja y sobra caudal. Se hace poco a poco, vigilando que el caudal no baje del MCSF.",
    nota: "Estrangular de más traslada el problema: pasas de upthrust a downthrust y a recirculación.",
    relacionados: ["mcsf", "downthrust", "recirculacion"],
    eventos: ["EV-02"],
  },

  bypass: {
    titulo: "Válvula de bypass",
    definicion:
      "Válvula que devuelve parte del fluido de la descarga hacia la succión, o hacia el tanque.",
    enCampo:
      "Se abre levemente para aliviar una succión demasiado alta cuando ya no queda margen para subir frecuencia.",
    nota: "Abierta de más, el fluido da vueltas sin ir a ningún lado y se calienta.",
    relacionados: ["presionSuccion", "recirculacion"],
    eventos: ["EV-11"],
  },

  recirculacion: {
    titulo: "Recirculación",
    definicion:
      "El fluido da vueltas dentro de la bomba en lugar de avanzar por la línea. Toda la energía del motor se convierte en calor.",
    enCampo:
      "Se reconoce por lo mismo que la delata siempre: buena presión, poco o nada de caudal y el cuerpo de la bomba calentándose.",
    relacionados: ["shutOff", "mcsf", "downthrust", "recalentamiento"],
    eventos: ["EV-05"],
  },

  shutOff: {
    titulo: "Shut-off (válvula cerrada)",
    definicion:
      "Operar con la descarga cerrada o casi cerrada: presión máxima y caudal cero.",
    enCampo:
      "Es la condición más agresiva en la que puede estar una HPS. Minutos, no horas.",
    nota: "Aquí el empuje es downthrust en su máximo, no upthrust. El upthrust es lo contrario: caudal excesivo.",
    relacionados: ["recirculacion", "downthrust", "recalentamiento"],
    eventos: ["EV-05"],
  },

  cavitacion: {
    titulo: "Cavitación",
    definicion:
      "El fluido llega con tan poca presión que hierve dentro de la bomba y forma burbujas que después implosionan contra el metal.",
    enCampo:
      "Suena como si la bomba estuviera bombeando grava. Viene con vibración y con caudal inestable.",
    nota: "Cada implosión arranca una partícula de metal del impulsor. No se recupera: es daño acumulado.",
    relacionados: ["npsh", "presionSuccion", "strainer", "bombaBooster"],
    eventos: ["EV-10", "EV-12", "EV-17"],
  },

  npsh: {
    titulo: "NPSH — presión mínima en la succión",
    definicion:
      "Margen de presión que la bomba necesita en la entrada para que el fluido no hierva. Se compara el disponible en la línea contra el requerido por la bomba.",
    enCampo:
      "Lo requerido crece con el caudal: cuanto más a la derecha de la curva operas, más presión de succión necesitas para no cavitar.",
    relacionados: ["cavitacion", "runout", "presionSuccion"],
  },

  gasLock: {
    titulo: "Gas lock / aire dentro de la bomba",
    definicion:
      "Bolsa de aire o de gas atrapada entre las etapas. La bomba gira normal pero no logra empujar nada.",
    enCampo:
      "El cuadro típico: parámetros normales en el variador, y aun así sin presión ni caudal. Se resuelve venteando por los capilares, con un balde debajo.",
    nota: "Mientras la bomba está en gas lock, el sello mecánico está trabajando sin lubricación.",
    relacionados: ["venteo", "selloMecanico", "amperaje"],
    eventos: ["EV-18"],
  },

  venteo: {
    titulo: "Venteo por capilares",
    definicion:
      "Purgar el aire atrapado abriendo las líneas capilares de la bomba hasta que salga fluido limpio y continuo.",
    enCampo:
      "Siempre con balde para evitar derrames, y con la presión de la unidad controlada.",
    relacionados: ["gasLock"],
    eventos: ["EV-18"],
  },

  escala: {
    titulo: "Escala / incrustación",
    definicion:
      "Depósito mineral duro que se va pegando a las paredes internas de la bomba, del medidor y de la línea.",
    enCampo:
      "Avanza despacio y se nota como una deriva: el amperaje sube semana a semana, el caudal baja y la presión de descarga sube.",
    nota: "Es la causa más común de un amperaje alto que crece con el tiempo, y la antesala de un eje partido en el arranque.",
    relacionados: ["amperaje", "turbina", "eje"],
    eventos: ["EV-08", "EV-21"],
  },

  solidos: {
    titulo: "Sólidos / arena",
    definicion: "Partículas que vienen con el fluido del cliente.",
    enCampo:
      "Tapan el strainer, erosionan los impulsores y rayan las caras del sello mecánico.",
    relacionados: ["strainer", "selloMecanico", "cavitacion"],
    eventos: ["EV-22"],
  },

  desgasteDeEtapas: {
    titulo: "Desgaste de etapas",
    definicion:
      "Pérdida gradual de material en impulsores y anillos. La bomba deja de sellar internamente y ya no alcanza su curva.",
    enCampo:
      "Se ve como una caída lenta y sostenida del head medido frente a la curva, evaluación tras evaluación.",
    nota: "Una caída progresiva apunta a desgaste; una caída brusca apunta a instrumentación o a una falla mecánica.",
    relacionados: ["curvaDeFabrica", "frecuenciaEquivalente", "solidos"],
    eventos: ["EV-26"],
  },

  recalentamiento: {
    titulo: "Recalentamiento del fluido",
    definicion:
      "El fluido retenido dentro de la bomba absorbe toda la energía del motor y sube de temperatura hasta llegar a vaporizarse.",
    enCampo:
      "Se detecta con la mano o con termómetro sobre el cuerpo de la bomba: temperatura por encima de lo habitual con caudal bajo o nulo.",
    relacionados: ["recirculacion", "shutOff", "selloMecanico"],
    eventos: ["EV-05", "EV-15"],
  },

  vibracion: {
    titulo: "Vibración",
    definicion:
      "Movimiento anormal de la unidad. Es un síntoma, nunca una causa.",
    enCampo:
      "Si cambia al cambiar el caudal, el origen es hidráulico (upthrust, cavitación, recirculación). Si no cambia, el origen es mecánico (desalineación, base floja, rodamientos).",
    relacionados: ["upthrust", "cavitacion", "acople"],
    eventos: ["EV-13"],
  },

  golpeDeAriete: {
    titulo: "Golpe de ariete",
    definicion:
      "Onda de presión que recorre la línea cuando el flujo se detiene de golpe, por un cierre brusco de válvula o una parada súbita.",
    enCampo:
      "Se oye como un golpe seco en la tubería. Castiga soportes, bridas y el check de descarga.",
    relacionados: ["presionDescarga"],
    eventos: ["EV-24"],
  },

  roturaDeEje: {
    titulo: "Rotura de eje",
    definicion:
      "Falla terminal: el eje se parte y el motor gira sin arrastrar los impulsores.",
    enCampo:
      "Se reconoce porque el amperaje cae en seco y la presión desaparece mientras el motor sigue corriendo. Se para la unidad de inmediato.",
    nota: "Es el final de una historia larga: upthrust sostenido, escala o vibración que nadie corrigió a tiempo.",
    relacionados: ["upthrust", "escala", "vibracion", "eje"],
    eventos: ["EV-20"],
  },
};

// ---------------------------------------------------------------------------
// Glosario unificado
// ---------------------------------------------------------------------------

/** @type {Record<string, Termino>} */
export const GLOSARIO = {
  ...GLOSARIO_CURVA,
  ...GLOSARIO_EMPUJE,
  ...GLOSARIO_UNIDAD,
  ...GLOSARIO_INSTRUMENTOS,
  ...GLOSARIO_PROCESO,
};

/** Secciones, por si quieres mostrarlas agrupadas en la interfaz. */
export const SECCIONES_GLOSARIO = {
  curva: { titulo: "La curva y el punto de operación", terminos: GLOSARIO_CURVA },
  empuje: { titulo: "Empuje axial", terminos: GLOSARIO_EMPUJE },
  unidad: { titulo: "Partes de la unidad", terminos: GLOSARIO_UNIDAD },
  instrumentos: { titulo: "Instrumentación", terminos: GLOSARIO_INSTRUMENTOS },
  proceso: { titulo: "Proceso, línea y modos de falla", terminos: GLOSARIO_PROCESO },
};

/** Devuelve un término por clave, tolerando mayúsculas y acentos. */
export function termino(clave) {
  if (!clave) return undefined;
  if (GLOSARIO[clave]) return GLOSARIO[clave];
  const norm = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const objetivo = norm(clave);
  const hit = Object.keys(GLOSARIO).find((k) => norm(k) === objetivo);
  return hit ? GLOSARIO[hit] : undefined;
}

/** Sólo los términos pedidos, para inyectar contexto acotado al modelo. */
export function terminosDe(claves = []) {
  return claves.map(termino).filter(Boolean);
}

/** Vuelca el glosario como texto plano para un prompt de sistema. */
export function glosarioParaPrompt({ soloClaves = null } = {}) {
  const l = ["GLOSARIO HPS", ""];
  for (const seccion of Object.values(SECCIONES_GLOSARIO)) {
    const entradas = Object.entries(seccion.terminos).filter(
      ([k]) => !soloClaves || soloClaves.includes(k)
    );
    if (!entradas.length) continue;
    l.push(`## ${seccion.titulo}`);
    for (const [, t] of entradas) {
      l.push(`- ${t.titulo}: ${t.definicion}`);
      if (t.enCampo) l.push(`  En campo: ${t.enCampo}`);
      if (t.nota) l.push(`  Nota: ${t.nota}`);
    }
    l.push("");
  }
  return l.join("\n").trim();
}

export const glosario = {
  terminos: GLOSARIO,
  secciones: SECCIONES_GLOSARIO,
  termino,
  terminosDe,
  glosarioParaPrompt,
};

export default glosario;
