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
import { MapPin } from "lucide-react";

interface MicroareaChartProps {
  patients: Patient[];
}

export const MicroareaChart = ({ patients }: MicroareaChartProps) => {
  const microareaCount: Record<string, number> = {};

  patients.forEach((p) => {
    const area = p.microarea || "N/A";
    microareaCount[area] = (microareaCount[area] || 0) + 1;
  });

  const microareaData = Object.entries(microareaCount)
    .map(([area, count]) => ({
      microarea: `Área ${area}`,
      quantidade: count,
    }))
    .sort((a, b) => a.microarea.localeCompare(b.microarea));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-success/10 p-2">
            <MapPin className="h-5 w-5 text-success" />
          </div>
          <CardTitle className="text-lg font-semibold">
            Pacientes por Microárea
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={microareaData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              dataKey="microarea"
              type="category"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={70}
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
              fill="hsl(172, 66%, 50%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
