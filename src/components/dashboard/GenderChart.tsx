import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Patient } from "@/hooks/usePatientData";
import { PieChart as PieChartIcon } from "lucide-react";

interface GenderChartProps {
  patients: Patient[];
}

const COLORS = ["hsl(199, 89%, 48%)", "hsl(172, 66%, 50%)"];

export const GenderChart = ({ patients }: GenderChartProps) => {
  const genderData = [
    {
      name: "Feminino",
      value: patients.filter((p) => p.sexo === "Feminino").length,
    },
    {
      name: "Masculino",
      value: patients.filter((p) => p.sexo === "Masculino").length,
    },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-secondary/10 p-2">
            <PieChartIcon className="h-5 w-5 text-secondary" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Distribuição por Sexo
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={genderData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {genderData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
