import { useQuery } from "@tanstack/react-query";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface OficialRow {
  mes: string;   // normalizado: "MM/YYYY"  ex: "01/2026"
  equipe: string;
  numB1: number; denB1: number;
  numB2: number; denB2: number;
  numB3: number; denB3: number;
  numB4: number; denB4: number;
  numB5: number; denB5: number;
  numB6: number; denB6: number;
}

export interface OficialData {
  rows: OficialRow[];
  /** Lookup rápido: chave = "MM/YYYY||EQUIPE_NORMALIZADA" */
  index: Map<string, OficialRow>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/**
 * Normaliza "jan./2026", "jan/2026", "janeiro/2026", "01/2026" → "01/2026"
 */
export const normalizeMes = (raw: string): string | null => {
  if (!raw) return null;
  // Remove ponto abreviativo e espaços, lowercase
  const s = raw.trim().toLowerCase().replace(/\.\s*/g, "");

  // Já está em MM/YYYY
  if (/^\d{2}\/\d{4}$/.test(s)) return s;

  // "jan/2026" | "janeiro/2026" | "jan-2026"
  const match = s.match(/^([a-záéíóúãõ]{3,})[\/\-](\d{4})$/);
  if (match) {
    const abbr = match[1].slice(0, 3);
    const year = match[2];
    const month = MONTH_MAP[abbr];
    if (month) return `${month}/${year}`;
  }

  return null;
};

/**
 * Normaliza nome de equipe para comparação:
 * "ESF SEDE 1" → "ESB CENTRO", variações de ESF/ESB, trim, uppercase
 */
export const normalizeEquipe = (raw: string): string => {
  if (!raw) return "";
  let s = raw.trim().toUpperCase();
  s = s.replace(/^ESF\b/, "ESB");
  if (s === "ESB SEDE 1") s = "ESB CENTRO";
  return s;
};

export const makeOficialKey = (mes: string, equipe: string): string =>
  `${mes}||${normalizeEquipe(equipe)}`;

const toNum = (v: string): number => {
  if (!v || v.trim() === "" || v.trim() === "-") return 0;
  return parseFloat(v.replace(",", ".")) || 0;
};

// ── Parser CSV ────────────────────────────────────────────────────────────────
const parseCSV = (text: string): OficialData => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { rows: [], index: new Map() };

  // Detecta separador (vírgula ou ponto-e-vírgula)
  const sep = lines[0].includes(";") ? ";" : ",";

  // Normaliza header: remove BOM, trim, uppercase
  const headers = lines[0]
    .replace(/^\uFEFF/, "")
    .split(sep)
    .map(h => h.trim().toUpperCase().replace(/\s+/g, " "));

  const col = (name: string) => headers.indexOf(name);

  const rows: OficialRow[] = [];
  const index = new Map<string, OficialRow>();

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 2) continue;

    const mesRaw    = cells[col("MÊS")]    ?? cells[col("MES")] ?? "";
    const equipeRaw = cells[col("EQUIPE")] ?? "";

    const mes = normalizeMes(mesRaw);
    if (!mes || !equipeRaw) continue;

    const row: OficialRow = {
      mes,
      equipe: equipeRaw,
      numB1: toNum(cells[col("NUMERADOR B1")]   ?? ""),
      denB1: toNum(cells[col("DENOMINADOR B1")] ?? ""),
      numB2: toNum(cells[col("NUMERADOR B2")]   ?? ""),
      denB2: toNum(cells[col("DENOMINADOR B2")] ?? ""),
      numB3: toNum(cells[col("NUMERADOR B3")]   ?? ""),
      denB3: toNum(cells[col("DENOMINADOR B3")] ?? ""),
      numB4: toNum(cells[col("NUMERADOR B4")]   ?? ""),
      denB4: toNum(cells[col("DENOMINADOR B4")] ?? ""),
      numB5: toNum(cells[col("NUMERADOR B5")]   ?? ""),
      denB5: toNum(cells[col("DENOMINADOR B5")] ?? ""),
      numB6: toNum(cells[col("NUMERADOR B6")]   ?? ""),
      denB6: toNum(cells[col("DENOMINADOR B6")] ?? ""),
    };

    rows.push(row);
    index.set(makeOficialKey(mes, equipeRaw), row);
  }

  return { rows, index };
};

// ── URL do CSV ────────────────────────────────────────────────────────────────
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=533321977&single=true&output=csv";

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useOficialData = () =>
  useQuery<OficialData>({
    queryKey: ["oficial-data"],
    queryFn: async () => {
      const res = await fetch(`${CSV_URL}&_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Erro ao buscar CSV oficial: ${res.status}`);
      const text = await res.text();
      return parseCSV(text);
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });
