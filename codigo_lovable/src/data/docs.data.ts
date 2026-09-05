/**
 * Documentación enlazada desde la pestaña de documentación.
 *
 * Los PDF viven en SharePoint de Sertecpet y requieren sesión corporativa: el
 * botón de descarga abre el documento allí. El botón de ver muestra la imagen
 * de la curva de fábrica, que sí se sirve desde `public/curvas/`, para poder
 * consultarla sin salir de la aplicación ni abrir el documento entero.
 */

export interface FichaTecnica {
  id: string;
  /** Unidades que comparten esta misma curva de fábrica. */
  unidades: string[];
  modelo: string;
  etapas: number;
  /** Imagen de la curva servida por la propia aplicación. */
  imagen: string;
  /** PDF completo en SharePoint. */
  documento: string;
}

export interface Procedimiento {
  id: string;
  titulo: string;
  codigo: string;
  documento: string;
}

export const fichasTecnicas: FichaTecnica[] = [
  {
    id: "tj12000-64",
    unidades: [
      "HPS-02",
      "HPS-04",
      "HPS-05",
      "HPS-06",
      "HPS-10",
      "HPS-11",
      "HPS-12",
      "HPS-13",
      "HPS-14",
      "HPS-15",
    ],
    modelo: "TJ12000",
    etapas: 64,
    imagen: "/curvas/tj12000-64.png",
    documento:
      "https://sertecpetec-my.sharepoint.com/:b:/r/personal/edizurieta_sertecpet_com/Documents/HPS-doom/Curva%20TJ12000%2064%20STG.pdf?d=wfe86fe808b1b410c98bbae8df48aa8aa&csf=1&web=1&e=Jzo2XX",
  },
  {
    id: "hc12500-61",
    unidades: ["HPS-03"],
    modelo: "HC12500",
    etapas: 61,
    imagen: "/curvas/hc12500-61.png",
    documento:
      "https://sertecpetec-my.sharepoint.com/:b:/r/personal/edizurieta_sertecpet_com/Documents/HPS-doom/Curva%20HC12500%2061%20STG.pdf?d=w666121c788d24073a2b19c0398d6b131&csf=1&web=1&e=4BtvMp",
  },
  {
    id: "hc27000-26",
    unidades: ["HPS-07"],
    modelo: "675HC27000",
    etapas: 26,
    imagen: "/curvas/hc27000-26.png",
    documento:
      "https://sertecpetec-my.sharepoint.com/:b:/r/personal/edizurieta_sertecpet_com/Documents/HPS-doom/Curva%20HC27000%2026%20STG.pdf?d=w0125ccb4e127480e916673c65b5b7cd2&csf=1&web=1&e=WW1QbH",
  },
  {
    id: "hc20000-19",
    unidades: ["HPS-08"],
    modelo: "675HC20000 Standard",
    etapas: 19,
    imagen: "/curvas/hc20000-19.png",
    documento:
      "https://sertecpetec-my.sharepoint.com/:b:/r/personal/edizurieta_sertecpet_com/Documents/HPS-doom/Curva%20HC20000%2019%20STG.pdf?d=wdefd0079fc27495e93ada37bfc0789b6&csf=1&web=1&e=cNLaw6",
  },
  {
    id: "hc20000-23",
    unidades: ["HPS-09"],
    modelo: "675HC20000",
    etapas: 23,
    imagen: "/curvas/hc20000-23.png",
    documento:
      "https://sertecpetec-my.sharepoint.com/:b:/r/personal/edizurieta_sertecpet_com/Documents/HPS-doom/Curva%20HC20000%2023%20STG.pdf?d=w13e7ac12dd3e4b549591790c405340b3&csf=1&web=1&e=7mL4IT",
  },
];

const INTRANET =
  "https://sertecpetec.sharepoint.com/:b:/r/sites/Intranet/politicasyprocedimientos/Documentos%20compartidos/STP%20ECUADOR/O02%20Early%20Production%20Facilities/2.%20Instructivos";

export const procedimientos: Procedimiento[] = [
  {
    id: "in-004",
    titulo: "Operación de bomba HPS",
    codigo: "EC.GC.EF.IN.004 Rev. 08",
    documento: `${INTRANET}/EC.GC.EF.IN.004%20REV08%20Operaci%C3%B3n%20de%20bombas%20hps%20movil%20(umh).pdf?d=wbf2117336e2040018ced583da38592ae&csf=1&web=1&e=xiOPnq`,
  },
  {
    id: "in-008",
    titulo: "Cambio de sistema de bombeo de reinyección de agua",
    codigo: "EC.GC.EF.IN.008 Rev. 03",
    documento: `${INTRANET}/EC.GC.EF.IN.008%20REV03%20Instructivo%20para%20el%20Cambio%20de%20Sistema%20de%20Bombeo%20de%20Re-inyecci%C3%B3n%20de%20Agua.pdf?d=w7a0a4ceeacfe47e684d16434a7e27dec&csf=1&web=1&e=8G0yzg`,
  },
  {
    id: "in-009",
    titulo: "Montaje y desmontaje de bombas HPS",
    codigo: "EC.GC.EF.IN.009 Rev. 03",
    documento: `${INTRANET}/EC.GC.EF.IN.009%20Rev%2003%20Montaje%20y%20desmontaje%20de%20bombas%20hps%20movil.pdf?d=wa321dc00cb61453790852db35feafd95&csf=1&web=1&e=eWLuu4`,
  },
  {
    // El enlace que llegó para este apunta al mismo PDF que el de montaje y
    // desmontaje. Queda pendiente sustituirlo por el documento correcto.
    id: "operacion-combustion",
    titulo: "Operación de bombas HPS con combustión",
    codigo: "Enlace por confirmar",
    documento: `${INTRANET}/EC.GC.EF.IN.009%20Rev%2003%20Montaje%20y%20desmontaje%20de%20bombas%20hps%20movil.pdf?d=wa321dc00cb61453790852db35feafd95&csf=1&web=1&e=eWLuu4`,
  },
];
