import { useEffect, useRef, useState } from "react";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=2062770567&single=true&output=csv";

export interface DenominadorB1 {
  porEquipe: Map<string, number>;
  total: number;
  loading: boolean;
  error: string | null;
}

export function useDenominadorB1(): DenominadorB1 {
  const mapRef = useRef<Map<string, number>>(new Map());
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

        const lines = text.trim().split("\n");
        const map = new Map<string, number>();
        let sum = 0;

        lines.slice(1).forEach(line => {
          const separator = line.includes(";") ? ";" : ",";
          const parts = line.split(separator).map(s => s.trim().replace(/\r/g, ""));
          const equipe = parts[0];
          const val = parseInt(parts[1], 10);
          if (equipe && !isNaN(val)) {
            map.set(equipe, val);
            sum += val;
          }
        });

        // atualiza a ref primeiro (leitura síncrona no useMemo)
        mapRef.current = map;

        // depois dispara re-render com o novo Map e total
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
