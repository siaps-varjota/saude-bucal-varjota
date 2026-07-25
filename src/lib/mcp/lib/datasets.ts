// Fontes de dados (planilhas publicadas) usadas pelo painel de Saúde Bucal de Varjota.
// Usado apenas pelas ferramentas MCP — sem leitura de env ou I/O no topo do módulo.

const BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=";

export interface Dataset {
  id: string;
  titulo: string;
  descricao: string;
  gid: string;
}

export const DATASETS: Dataset[] = [
  {
    id: "b1_primeira_consulta",
    titulo: "B1 — 1ª Consulta Odontológica",
    descricao: "Pacientes individuais com/sem primeira consulta odontológica programática.",
    gid: "424984913",
  },
  {
    id: "b1_denominador",
    titulo: "B1 — Denominador (população)",
    descricao: "População de referência por equipe usada como denominador do indicador B1.",
    gid: "2062770567",
  },
  {
    id: "b2_tratamento",
    titulo: "B2 — Tratamento Odontológico Concluído",
    descricao: "Pacientes individuais e situação do tratamento odontológico.",
    gid: "929511633",
  },
  {
    id: "b3_exodontias",
    titulo: "B3 — Taxa de Exodontias",
    descricao: "Dados agregados mensais de exodontias por equipe.",
    gid: "1259472924",
  },
  {
    id: "b4_escovacao",
    titulo: "B4 — Escovação Dental Supervisionada",
    descricao: "Dados agregados mensais de escovação supervisionada por equipe.",
    gid: "506888516",
  },
  {
    id: "b5_preventivos",
    titulo: "B5 — Procedimentos Odontológicos Preventivos",
    descricao: "Dados agregados mensais de procedimentos preventivos por equipe.",
    gid: "987145384",
  },
  {
    id: "b6_art",
    titulo: "B6 — Tratamento Restaurador Atraumático (ART)",
    descricao: "Dados agregados mensais de ART por equipe.",
    gid: "1896101952",
  },
  {
    id: "dados_oficiais",
    titulo: "Dados oficiais (consolidado)",
    descricao:
      "Valores oficiais por mês/equipe. Quando existe linha oficial, ela prevalece sobre o preliminar, mesmo se zerada.",
    gid: "533321977",
  },
];

export const getDataset = (id: string) => DATASETS.find((d) => d.id === id);

export const datasetUrl = (d: Dataset) => `${BASE}${d.gid}&single=true&output=csv&_=${Date.now()}`;
