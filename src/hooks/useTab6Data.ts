import { useQuery } from "@tanstack/react-query";

export interface Tab6Record {
  equipe: string;
  exodontias: number;
  totalProcedimentos: number;
  porcentagem: number;
  mesAno: string; // "janeiro/2026"
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=1896101952&single=true&output=csv";

const MONTH_ABBR: Record<string, string> = {
  "jan.": "janeiro", "fev.": "fevereiro", "mar.": "março", "abr.": "abril",
  "mai.": "maio", "jun.": "junho", "jul.": "julho", "ago.": "agosto",
  "set.": "setembro", "out.": "outubro", "nov.": "novembro", "dez.": "dezembro",
};

const parseCSVLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
};

const expandMonth = (abbr: string): string => {
  const match = abbr.match(/^([a-zç]+\.?)-?(\d{4})$/i);
  if (!match) return abbr;
  const key = match[1].toLowerCase().endsWith('.') ? match[1].toLowerCase() : match[1].toLowerCase() + '.';
  const full = MONTH_ABBR[key] || match[1];
  return `${full}/${match[2]}`;
};

const parseCSV = (csv: string): Tab6Record[] => {
  const lines = csv.split("\n").map((l) => l.replace(/\r$/, ""));
  const records: Tab6Record[] = [];
  let currentMonth = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const fields = parseCSVLine(line);

    // Month header: first field has text, rest are empty
    if (fields[0] && fields.slice(1).every((f) => !f)) {
      const val = fields[0].trim();
      if (/[a-záàâãéèêíïóôõúç]+\/\d{4}/i.test(val)) {
        currentMonth = val;
      }
      continue;
    }

    // Skip column headers
    if (fields[0]?.toUpperCase().includes("EQUIPE")) continue;

    // Data row
    if ((fields[0]?.startsWith("ESF") || fields[0]?.startsWith("ESB")) && currentMonth) {
      const exodontias = parseInt(fields[1]) || 0;
      const totalProcedimentos = parseInt(fields[2]) || 0;
      const porcentagemStr = (fields[3] || "0").replace(",", ".").replace("%", "");
      const porcentagem = parseFloat(porcentagemStr) || 0;

      if (fields[4]) {
        const expanded = expandMonth(fields[4]);
        if (expanded.includes("/")) {
          currentMonth = expanded;
        }
      }

      records.push({
        equipe: fields[0].trim(),
        exodontias,
        totalProcedimentos,
        porcentagem,
        mesAno: currentMonth,
      });
    }
  }

  return records;
};

const fetchTab6Data = async (): Promise<Tab6Record[]> => {
  const response = await fetch(`${CSV_URL}&_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Falha ao carregar dados");
  }
  const csv = await response.text();
  return parseCSV(csv);
};

export const useTab6Data = () => {
  return useQuery({
    queryKey: ["tab6-data"],
    queryFn: fetchTab6Data,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
