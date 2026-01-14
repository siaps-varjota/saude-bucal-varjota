import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Patient } from "@/hooks/usePatientData";
import { BarChart3 } from "lucide-react";

interface AgeChartProps {
  patients: Patient[];
}

export const AgeChart = ({ patients }: AgeChartProps) => {
  const ageGroups = [
    { range: "0-10", min: 0, max: 10 },
    { range: "11-20", min: 11, max: 20 },
    { range: "21-30", min: 21, max: 30 },
    { range: "31-40", min: 31, max: 40 },
    { range: "41-50", min: 41, max: 50 },
    { range: "51-60", min: 51, max: 60 },
    { range: "60+", min: 61, max: 150 },
  ];

  const ageData = ageGroups.map((group) => ({
    faixa: group.range,
    quantidade: patients.filter(
      (p) => p.idade >= group.min && p.idade <= group.max
    ).length,
  }));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent/10 p-2">
            <BarChart3 className="h-5 w-5 text-accent" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Distribuição por Faixa Etária
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="faixa"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Bar
              dataKey="quantidade"
              fill="hsl(199, 89%, 48%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
