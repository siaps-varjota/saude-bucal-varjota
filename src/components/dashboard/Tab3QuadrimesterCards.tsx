import { useMemo } from "react";
import { Tab3Patient } from "@/hooks/useTab3Data";
import { isExodontiaPendente } from "@/hooks/useFilteredTab3";
import { StatsCard } from "./StatsCard";
import { Calendar } from "lucide-react";

interface Tab3QuadrimesterCardsProps {
  patients: Tab3Patient[];
}

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === "-") return null;
  
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  return null;
};

export const Tab3QuadrimesterCards = ({ patients }: Tab3QuadrimesterCardsProps) => {
  const quadrimesterData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Define quadrimesters (Q1: Jan-Apr, Q2: May-Aug, Q3: Sep-Dec)
    const quadrimesters = [
      { name: "1º Quad", months: [0, 1, 2, 3], year: currentYear },
      { name: "2º Quad", months: [4, 5, 6, 7], year: currentYear },
      { name: "3º Quad", months: [8, 9, 10, 11], year: currentYear },
    ];

    return quadrimesters.map(q => {
      const count = patients.filter(patient => {
        if (isExodontiaPendente(patient.numeradorB3)) return false;
        
        const date = parseDate(patient.dataAtendimento);
        if (!date) return false;
        
        return date.getFullYear() === q.year && q.months.includes(date.getMonth());
      }).length;

      return { ...q, count };
    });
  }, [patients]);

  const variants = ["warning", "accent", "secondary"] as const;

  return (
    <>
      {quadrimesterData.map((q, index) => (
        <StatsCard
          key={q.name}
          title={`${q.name} ${q.year}`}
          value={q.count.toLocaleString("pt-BR")}
          icon={Calendar}
          variant={variants[index]}
        />
      ))}
    </>
  );
};
