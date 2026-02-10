import { useQuery } from "@tanstack/react-query";

export interface Tab6Patient {
  id: number;
  equipe: string;
  nome: string;
  cns: string;
  cpf: string;
  dataNascimento: string;
  idade: number;
  sexo: string;
  teveTRA: string;
  ultimaData: string;
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=817850522&single=true&output=csv";

const parseCSV = (csv: string): Tab6Patient[] => {
  const lines = csv.split("\n");
  // Skip header row
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

      return {
        id: index + 1,
        equipe: fields[0] || "",
        nome: fields[1] || "",
        cns: fields[2] || "",
        cpf: fields[3] || "",
        dataNascimento: fields[4] || "",
        idade: parseInt(fields[5]) || 0,
        sexo: fields[6] || "",
        teveTRA: fields[7] || "NÃO",
        ultimaData: fields[8] || "-",
      };
    })
    .filter((p) => p.nome.trim() !== "");
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
