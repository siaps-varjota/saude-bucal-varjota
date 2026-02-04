import { useMemo } from "react";
import { Tab3Patient } from "@/hooks/useTab3Data";
import { isExodontiaPendente } from "@/hooks/useFilteredTab3";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tab3MonthlyCardsProps {
  patients: Tab3Patient[];
}

const getMonthName = (month: number): string => {
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];
  return months[month];
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === "-") return null;
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  return null;
};

export const Tab3MonthlyCards = ({ patients }: Tab3MonthlyCardsProps) => {
  const totalPatients = patients.length;

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: number; year: number; countSim: number; total: number }[] = [];
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        countSim: 0,
        total: 0
      });
    }

    // Count all patients and exodontias (numeradorB3 = "SIM") per month based on dataAtendimento
    patients.forEach(patient => {
      const date = parseDate(patient.dataAtendimento);
      if (date) {
        const monthIndex = months.findIndex(
          m => m.month === date.getMonth() && m.year === date.getFullYear()
        );
        if (monthIndex !== -1) {
          months[monthIndex].total++;
          if (!isExodontiaPendente(patient.numeradorB3)) {
            months[monthIndex].countSim++;
          }
        }
      }
    });

    return months;
  }, [patients]);

  // Calculate rate based on percentage thresholds
  const getVariantByPercentage = (percentage: number) => {
    if (percentage <= 25) return "bg-red-500/10 border-red-500/30 text-red-700";
    if (percentage <= 50) return "bg-amber-500/10 border-amber-500/30 text-amber-700";
    if (percentage <= 75) return "bg-emerald-500/10 border-emerald-500/30 text-emerald-700";
    return "bg-blue-500/10 border-blue-500/30 text-blue-700";
  };

  return (
    <div className="space-y-4">
      {/* Score Legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">Pontuação:</span>
        <Badge className="bg-red-500 hover:bg-red-500 text-white">Regular: ≤ 25%</Badge>
        <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Suficiente: &gt; 25% e ≤ 50%</Badge>
        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">Bom: &gt; 50% e ≤ 75%</Badge>
        <Badge className="bg-blue-500 hover:bg-blue-500 text-white">Ótimo: &gt; 75%</Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        {monthlyData.map((data, index) => {
          const percentage = totalPatients > 0 ? (data.countSim / totalPatients) * 100 : 0;

          return (
            <Card 
              key={index} 
              className={`border ${getVariantByPercentage(percentage)} transition-all hover:scale-105`}
            >
              <CardContent className="p-3 text-center">
                <p className="text-xs font-medium opacity-70">
                  {getMonthName(data.month)}/{data.year.toString().slice(-2)}
                </p>
                <p className="text-2xl font-bold mt-1">{data.countSim}</p>
                <p className="text-xs font-medium opacity-70 mt-1">
                  {percentage.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
