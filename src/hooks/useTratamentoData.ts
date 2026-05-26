import { useQuery } from "@tanstack/react-query";

export interface TratamentoPatient {
  id: number;
  equipe: string;
  microarea: string;
  nome: string;
  dataNascimento: string;
  cpfCns: string;
  sexo: string;
  idade: number;
  primeiraConsulta: string;
  tratamentoConcluido: string;
  comTratamentoConcluido: string;
}

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=929511633&single=true&output=csv";

const parseCSV = (csv: string): TratamentoPatient[] => {
  const lines = csv.split("\n");
  const dataLines = lines.slice(4);
  return dataLines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const fields: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          fields.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      fields.push(current.trim());

      const idade = parseInt(fields[7]) || 0;
      return {
        id: parseInt(fields[0]) || 0,
        equipe: fields[1] || "",
        microarea: fields[2] || "",
        nome: fields[3] || "",
        dataNascimento: fields[4] || "",
        cpfCns: fields[5] || "",
        sexo: fields[6] || "",
        idade,
        primeiraConsulta: fields[8] || "-",
        tratamentoConcluido: fields[9] || "-",
        comTratamentoConcluido: fields[10] || "Pendente",
      };
    })
    .filter((patient) => patient.id > 0);
};

const fetchTratamentoData = async (): Promise<TratamentoPatient[]> => {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error("Falha ao carregar dados");
  }
  const csv = await response.text();
  return parseCSV(csv);
};

// ─── Helpers de numerador ────────────────────────────────────────────────────

const parseDateBR = (d: string): number => {
  const [dia, mes, ano] = d.split("/").map(Number);
  return new Date(ano, mes - 1, dia).getTime();
};

/** Todos os pacientes com status "Concluído", independente de período */
export const getTratamentoConcluido = (
  patients: TratamentoPatient[]
): TratamentoPatient[] =>
  patients.filter((p) => p.comTratamentoConcluido === "Concluído");

/** Pacientes com status "Concluído" cuja data de conclusão cai no período */
export const getTratamentoConcluidoPorPeriodo = (
  patients: TratamentoPatient[],
  dataInicio: string, // "DD/MM/YYYY"
  dataFim: string     // "DD/MM/YYYY"
): TratamentoPatient[] => {
  const inicio = parseDateBR(dataInicio);
  const fim = parseDateBR(dataFim);

  return patients.filter((p) => {
    if (p.comTratamentoConcluido !== "Concluído") return false;
    if (!p.tratamentoConcluido || p.tratamentoConcluido === "-") return false;
    const data = parseDateBR(p.tratamentoConcluido);
    return data >= inicio && data <= fim;
  });
};

// ─── Hook principal ──────────────────────────────────────────────────────────

export const useTratamentoData = () => {
  return useQuery({
    queryKey: ["tratamento"],
    queryFn: fetchTratamentoData,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
