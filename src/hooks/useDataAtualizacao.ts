import { useQuery } from "@tanstack/react-query";

// Aba "B1 LISTA" (pacientes B1). A data/hora da última atualização fica na célula A1.
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=424984913&single=true&output=csv";


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
  // Célula A1 = primeira coluna do primeiro registro do CSV
  const registros = lerPrimeirosRegistros(text, 1);
  const a1 = registros[0]?.[0]?.trim();
  return a1 ? a1 : null;
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
