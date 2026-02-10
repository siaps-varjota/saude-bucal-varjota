import { useQuery } from "@tanstack/react-query";

export interface Tab6Patient {
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
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=817850522&single=true&output=csv";

const parseCSV = (csv: string): Tab6Patient[] => {
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

const fetchTab6Data = async (): Promise<Tab6Patient[]> => {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error("Falha ao carregar dados");
  }
  const csv = await response.text();
  return parseCSV(csv);
};

export const useTab6Data = () => {
  return useQuery({
    queryKey: ["tab6-patients"],
    queryFn: fetchTab6Data,
    staleTime: 5 * 60 * 1000,
  });
};
