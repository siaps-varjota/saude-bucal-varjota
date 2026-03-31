import { useQuery } from "@tanstack/react-query";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=2062770567&single=true&output=csv";

export interface DenominadorB1Data {
  porEquipe: Record<string, number>;
  total: number;
}

/**
 * Normaliza o nome da equipe para facilitar a comparação
 * Remove espaços extras, converte para maiúsculas e remove acentos básicos
 */
const normalizeEquipeName = (name: string): string => {
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
};

const fetchDenominadorB1 = async (): Promise<DenominadorB1Data> => {
  // Adicionando um timestamp para evitar cache do navegador e garantir dados novos
  const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();

  // Divide por linhas e remove linhas vazias
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const porEquipe: Record<string, number> = {};
  let total = 0;

  // Pula o cabeçalho
  lines.slice(1).forEach(line => {
    // Tenta detectar o separador (vírgula ou ponto e vírgula)
    const separator = line.includes(";") ? ";" : ",";
    const parts = line.split(separator).map(s => s.trim());
    
    const rawEquipe = parts[0];
    // Remove caracteres não numéricos antes de converter
    const valStr = parts[1]?.replace(/[^\d]/g, "");
    const val = parseInt(valStr, 10);

    if (rawEquipe && !isNaN(val)) {
      const normalizedEquipe = normalizeEquipeName(rawEquipe);
      porEquipe[normalizedEquipe] = val;
      total += val;
    }
  });

  return { porEquipe, total };
};

export function useDenominadorB1() {
  return useQuery({
    queryKey: ["denominadorB1"],
    queryFn: fetchDenominadorB1,
    // Reduzi o staleTime para 1 minuto para que os dados atualizem mais frequentemente
    staleTime: 1 * 60 * 1000,
    // Garante que ele busque novamente ao focar na janela
    refetchOnWindowFocus: true,
  });
}
