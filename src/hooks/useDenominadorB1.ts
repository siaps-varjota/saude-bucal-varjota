import { useEffect, useState } from "react";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=2062770567&single=true&output=csv";

export interface DenominadorB1 {
  porEquipe: Map<string, number>;
  total: number;
  loading: boolean;
  error: string | null;
}

export function useDenominadorB1(): DenominadorB1 {
  const [porEquipe, setPorEquipe] = useState<Map<string, number>>(new Map());
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(CSV_URL)
      .then(r => {
        console.log("[DenominadorB1] status:", r.status, "ok:", r.ok);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => {
        if (cancelled) return;

        console.log("[DenominadorB1] CSV raw (primeiros 500 chars):", text.slice(0, 500));

        const lines = text.trim().split("\n");
        console.log("[DenominadorB1] total de linhas:", lines.length);
        console.log("[DenominadorB1] cabeçalho:", lines[0]);

        const map = new Map<string, number>();
        let sum = 0;

        lines.slice(1).forEach((line, idx) => {
          // tenta vírgula e ponto-e-vírgula como separador
          const separator = line.includes(";") ? ";" : ",";
          const parts = line.split(separator).map(s => s.trim().replace(/\r/g, ""));
          const equipe = parts[0];
          const val = parseInt(parts[1], 10);

          console.log(`[DenominadorB1] linha ${idx + 2}: equipe="${equipe}" denom="${parts[1]}" parseado=${val}`);

          if (equipe && !isNaN(val)) {
            map.set(equipe, val);
            sum += val;
          }
        });

        console.log("[DenominadorB1] total calculado:", sum);
        console.log("[DenominadorB1] porEquipe:", Object.fromEntries(map));

        setPorEquipe(map);
        setTotal(sum);
        setError(null);
      })
      .catch(e => {
        console.error("[DenominadorB1] ERRO:", e);
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { porEquipe, total, loading, error };
}
