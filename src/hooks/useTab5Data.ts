import { useQuery } from "@tanstack/react-query";

export interface Tab5Record {
  equipe: string;
  preventivos: number;
  totalIndividuais: number;
  porcentagem: number;
  mesAno: string; // "janeiro/2026"
}

const TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTLJd6v3fx1eOqe31mCAmxPHdJz0eDhQuujwRx5O6tQpFbPAQSMXzRNMpi3CKNT8mpw7UnMyfsOaPMD/pub?gid=0&single=true&output=tsv";

const parseTSV = (tsv: string): Tab5Record[] => {
  const lines = tsv.split("\n").map((l) => l.replace(/\r$/, ""));
  const records: Tab5Record[] = [];
  let currentMonth = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split("\t");

    // Check if this is a month header line (single field, no tabs, contains "/")
    if (fields.length === 1 && /[a-záàâãéèêíïóôõúç]+\/\d{4}/i.test(line)) {
      currentMonth = line;
      continue;
    }

    // Skip column header rows
    if (fields[0] === "EQUIPE" || fields[0]?.toUpperCase().includes("EQUIPE")) {
      continue;
    }

    // Data row
    if (fields.length >= 3 && currentMonth && fields[0]?.startsWith("ESF")) {
      const preventivos = parseInt(fields[1]) || 0;
      const totalIndividuais = parseInt(fields[2]) || 0;
      const porcentagemStr = fields[3]?.replace(",", ".").replace("%", "") || "0";
      const porcentagem = parseFloat(porcentagemStr) || 0;

      records.push({
        equipe: fields[0].trim(),
        preventivos,
        totalIndividuais,
        porcentagem,
        mesAno: currentMonth,
      });
    }
  }

  return records;
};

const fetchTab5Data = async (): Promise<Tab5Record[]> => {
  const response = await fetch(TSV_URL);
  if (!response.ok) {
    throw new Error("Falha ao carregar dados");
  }
  const tsv = await response.text();
  return parseTSV(tsv);
};

export const useTab5Data = () => {
  return useQuery({
    queryKey: ["tab5-data"],
    queryFn: fetchTab5Data,
    staleTime: 5 * 60 * 1000,
  });
};
