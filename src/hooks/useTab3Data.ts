import { useQuery } from "@tanstack/react-query";

export interface Tab3Patient {
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

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQCCU3B9MSiYLWTEMX4Cia2Tq4u_hMxTC3fqNscPPijatjZYoLxeL1jIIC0J6GrS6-1oqv0iDGpm3X8/pub?gid=1509802775&single=true&output=csv";

const parseCSV = (csv: string): Tab3Patient[] => {
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
