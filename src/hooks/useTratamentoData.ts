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
  // Começa da linha 4 (índice 3) conforme solicitado
  const dataLines = lines.slice(4);

  return dataLines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      // Parse CSV considerando campos com vírgulas dentro de aspas
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
        comTratamentoConcluido: fields[10] || "NÃO",
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

export const useTratamentoData = () => {
  return useQuery({
    queryKey: ["tratamento"],
    queryFn: fetchTratamentoData,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
