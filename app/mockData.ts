export interface NotaPersonal {
  id: string;
  contenido: string;
  fecha: string;
}

export interface Norma {
  id: string;
  entidad: 'CREG' | 'UPME' | 'MME' | 'XM';
  numero: string;
  titulo: string;
  resumen: string;
  linkOficial: string;
  fechaEmision: string;
  notasPersonales: NotaPersonal[];
}

export const NORMAS_MOCK: Norma[] = [
  {
    id: '1',
    entidad: 'CREG',
    numero: 'CREG 174 de 2021',
    titulo: 'Regula las actividades de autogeneración a pequeña escala y generación distribuida.',
    resumen: 'Define las condiciones administrativas y técnicas para la conexión de autogeneradores (AGPE) a los sistemas de distribución local.',
    linkOficial: 'https://www.creg.gov.co',
    fechaEmision: '2021-10-22',
    notasPersonales: [
      { id: 'n1', contenido: 'Revisar límites de potencia para entregas a la red sin estudio de conexión detallado.', fecha: '2026-05-10' },
      { id: 'n2', contenido: 'Tener en cuenta el trámite simplificado ante el operador de red.', fecha: '2026-06-15' }
    ]
  },
  {
    id: '2',
    entidad: 'UPME',
    numero: 'UPME 563 de 2026',
    titulo: 'Procedimiento de gestión de solicitudes de incentivos tributarios.',
    resumen: 'Establece los requisitos para solicitar la certificación de incentivos tributarios de la Ley 1715 para proyectos de Fuentes No Convencionales de Energía (FNCE).',
    linkOficial: 'https://www.upme.gov.co',
    fechaEmision: '2026-01-15',
    notasPersonales: [
      { id: 'n3', contenido: 'Aplica para exención de IVA en paneles y certificar la deducción de renta.', fecha: '2026-07-02' }
    ]
  }
];