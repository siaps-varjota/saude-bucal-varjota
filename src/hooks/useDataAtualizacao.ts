import { useQuery } from "@tanstack/react-query";

// Aba "DADOS" (pacientes B1). A data/hora da última atualização fica na célula O2.
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=424984913&single=true&output=csv";

const COL_O = 14; // A=0 ... O=14
const REGEX_DATA = /\d{1,2}\/\d{1,2}\/\d{2,4}/;

/** Lê só as primeiras linhas do CSV, respeitando aspas (inclusive quebra de linha dentro da célula). */
const lerPrimeirosRegistros = (text: string, maxRegistros: number): string[][] => {
  const registros: string[][] = [];
  let linha: string[] = [];
  let cur = "";
  let aspas = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length && registros.length < maxRegistros; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') aspas = false;
      else cur += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ",") { linha.push(cur.trim()); cur = ""; }
    else if (ch === "\n") { linha.push(cur.trim()); registros.push(linha); linha = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  return registros;
};

export const extrairDataAtualizacao = (text: string): string | null => {
  const registros = lerPrimeirosRegistros(text, 8);
  // 1) célula O2 (linha 2, coluna O)
  const o2 = registros[1]?.[COL_O]?.trim();
  if (o2 && REGEX_DATA.test(o2)) return o2;
  // 2) plano B: rótulo "DATA DA ATUALIZAÇÃO" em qualquer lugar do topo; a data vem na célula abaixo
  for (let r = 0; r < registros.length; r++) {
    for (let c = 0; c < registros[r].length; c++) {
      if (/ATUALIZA/i.test(registros[r][c])) {
        const abaixo = registros[r + 1]?.[c]?.trim();
        if (abaixo && REGEX_DATA.test(abaixo)) return abaixo;
      }
    }
  }
  // 3) plano C: qualquer data/hora na coluna O do topo
  for (const reg of registros) {
    const v = reg[COL_O]?.trim();
    if (v && REGEX_DATA.test(v)) return v;
  }
  return null;
};

/** Independente dos demais dados: se falhar, nada mais do painel é afetado. */
export const useDataAtualizacao = () =>
  useQuery<string | null>({
    queryKey: ["data-atualizacao"],
    queryFn: async () => {
      try {
        const res = await fetch(`${CSV_URL}&_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return null;
        return extrairDataAtualizacao(await res.text());
      } catch {
        return null;
      }
    },
    staleTime: 0,
    retry: false,
  });
