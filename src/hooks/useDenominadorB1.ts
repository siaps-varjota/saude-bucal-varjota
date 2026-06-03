import { useQuery } from "@tanstack/react-query";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=2062770567&single=true&output=csv";

export interface DenominadorB1Data {
  porEquipe: Record<string, number>;
  total: number;
}

const fetchDenominadorB1 = async (): Promise<DenominadorB1Data> => {
  const response = await fetch(CSV_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const lines = text.trim().split("\n");
  const porEquipe: Record<string, number> = {};
  let total = 0;
  lines.slice(1).forEach(line => {
    const separator = line.includes(";") ? ";" : ",";
    const parts = line.split(separator).map(s => s.trim().replace(/\r/g, ""));
    const equipe = parts[0];
    const val = parseInt(parts[1], 10);
    if (equipe && !isNaN(val)) {
      porEquipe[equipe] = val;
      total += val;
    }
  });
  return { porEquipe, total };
};

export function useDenominadorB1() {
  return useQuery({
    queryKey: ["denominadorB1"],
    queryFn: fetchDenominadorB1,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
