import { useQuery } from "@tanstack/react-query";

export interface Tab3Patient {
  id: number;
  equipe: string;
  microarea: string;
  nome: string;
  dataNascimento: string;
  cpfCns: string;
  idade: number;
  sexo: string;
  numeradorB3: string;
  dataAtendimento: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQCCU3B9MSiYLWTEMX4Cia2Tq4u_hMxTC3fqNscPPijatjZYoLxeL1jIIC0J6GrS6-1oqv0iDGpm3X8/pub?gid=1509802775&single=true&output=csv";

const parseCSV = (csv: string): Tab3Patient[] => {
  const lines = csv.split("\n");
  // Skip header row (first line)
  const dataLines = lines.slice(1);

  return dataLines
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
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

      // CSV structure: Equipe, Microárea, Nome, Data de Nascimento, CPF/CNS, Idade, Sexo, Numerador B3, Data do atendimento
      const idade = parseInt(fields[5]) || 0;

      return {
        id: index + 1,
        equipe: fields[0] || "",
        microarea: fields[1] || "-",
        nome: fields[2] || "",
        dataNascimento: fields[3] || "",
        cpfCns: fields[4] || "",
        idade,
        sexo: fields[6] || "",
        numeradorB3: fields[7] || "NÃO",
        dataAtendimento: fields[8] || "-",
      };
    })
    .filter((patient) => patient.nome.trim() !== "");
};

const fetchTab3Data = async (): Promise<Tab3Patient[]> => {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error("Falha ao carregar dados");
  }
  const csv = await response.text();
  return parseCSV(csv);
};

export const useTab3Data = () => {
  return useQuery({
    queryKey: ["tab3-patients"],
    queryFn: fetchTab3Data,
    staleTime: 5 * 60 * 1000,
  });
};
