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
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => {
        if (cancelled) return;
        const lines = text.trim().split("\n").slice(1); // pula cabeçalho
        const map = new Map<string, number>();
        let sum = 0;
        lines.forEach(line => {
          const [equipe, denom] = line.split(",").map(s => s.trim().replace(/\r/g, ""));
          const val = parseInt(denom, 10);
          if (equipe && !isNaN(val)) {
            map.set(equipe, val);
            sum += val;
          }
        });
        setPorEquipe(map);
        setTotal(sum);
        setError(null);
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { porEquipe, total, loading, error };
}
