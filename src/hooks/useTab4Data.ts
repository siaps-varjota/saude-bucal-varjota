import { useQuery } from "@tanstack/react-query";

export interface Tab4Patient {
  id: number;
  equipe: string;
  microarea: string;
  nome: string;
  dataNascimento: string;
  cpfCns: string;
  sexo: string;
  idade: number;
  primeiraConsulta: string;
  comPrimeiraConsulta: string;
}

// PLACEHOLDER: Substituir pelo link CSV real
const CSV_URL = "PLACEHOLDER_CSV_URL_TAB4";

const parseCSV = (csv: string): Tab4Patient[] => {
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
        comPrimeiraConsulta: fields[9] || "NÃO",
      };
    })
    .filter((patient) => patient.id > 0);
};

const fetchTab4Data = async (): Promise<Tab4Patient[]> => {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error("Falha ao carregar dados");
  }
  const csv = await response.text();
  return parseCSV(csv);
};

export const useTab4Data = () => {
  return useQuery({
    queryKey: ["tab4-patients"],
    queryFn: fetchTab4Data,
    staleTime: 5 * 60 * 1000,
  });
};
