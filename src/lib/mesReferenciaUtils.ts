import { parse, isValid, format } from "date-fns";

const MONTH_MAP: Record<string, string> = {
  "janeiro": "01", "fevereiro": "02", "março": "03", "abril": "04",
  "maio": "05", "junho": "06", "julho": "07", "agosto": "08",
  "setembro": "09", "outubro": "10", "novembro": "11", "dezembro": "12",
};

/** Convert "janeiro/2026" → "01/2026" */
export const mesAnoToMMYYYY = (mesAno: string): string => {
  const parts = mesAno.split("/");
  if (parts.length !== 2) return "";
  const monthNum = MONTH_MAP[parts[0].toLowerCase()];
  if (!monthNum) return "";
  return `${monthNum}/${parts[1]}`;
};

/** Extract MM/yyyy from a date string like "dd/MM/yyyy" */
export const dateToMMYYYY = (dateStr: string): string | null => {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return null;
  const fmts = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of fmts) {
    try {
      const parsed = parse(dateStr.trim(), fmt, new Date());
      if (isValid(parsed)) return format(parsed, "MM/yyyy");
    } catch { continue; }
  }
  return null;
};

/** Extract unique sorted MM/yyyy options from date fields */
export const extractMesesFromDates = (dates: string[]): string[] => {
  const set = new Set<string>();
  dates.forEach(d => {
    const mmyyyy = dateToMMYYYY(d);
    if (mmyyyy) set.add(mmyyyy);
  });
  return sortMeses(Array.from(set));
};

/** Extract unique sorted MM/yyyy options from mesAno fields (e.g., "janeiro/2026") */
export const extractMesesFromMesAno = (mesAnos: string[]): string[] => {
  const set = new Set<string>();
  mesAnos.forEach(m => {
    const mmyyyy = mesAnoToMMYYYY(m);
    if (mmyyyy) set.add(mmyyyy);
  });
  return sortMeses(Array.from(set));
};

const sortMeses = (arr: string[]): string[] =>
  arr.sort((a, b) => {
    const [ma, ya] = a.split("/").map(Number);
    const [mb, yb] = b.split("/").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

/** Check if a MM/yyyy value matches any of the selected months (empty array = all) */
export const matchesMesReferencia = (mmyyyy: string | null, selected: string[]): boolean => {
  if (selected.length === 0) return true; // "todos"
  if (!mmyyyy) return false;
  return selected.includes(mmyyyy);
};
