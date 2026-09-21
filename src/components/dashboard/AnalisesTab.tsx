import { useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/dashboard/MultiSelect";
import { Filter } from "lucide-react";
import { Quadrimestre, QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";
import { useResultadoFinal as computeResultadoFinal, EquipeResult } from "@/hooks/useResultadoFinal";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { OficialData } from "@/hooks/useOficialData";

interface AnalisesTabProps {
  patients: Patient[];
  tratamentoPatients: TratamentoPatient[];
  tab3Patients: Tab3Record[];
  tab4Patients: Tab4Patient[];
  tab5Patients: Tab5Record[];
  tab6Patients: Tab6Record[];
  denominadorB1Data: { porEquipe: Record<string, number>; total: number };
  equipeOptions: string[];
  oficialData?: OficialData;
}

interface ParetoRow {
  indicador: string;
  perda: number;
  acumulado: number;
  peso: number;
  nota: number;
}

export const AnalisesTab = ({
  patients, tratamentoPatients, tab3Patients, tab4Patients, tab5Patients, tab6Patients,
  denominadorB1Data, equipeOptions, oficialData,
}: AnalisesTabProps) => {
  const [equipes, setEquipes] = useState<string[]>([]);
  const [quads, setQuads] = useState<Quadrimestre[]>([]);
  const [indicadoresSel, setIndicadoresSel] = useState<string[]>([]);

  // Resultados por quadrimestre selecionado (vazio = todos os períodos)
  const resultados = useMemo(() => {
    const lista: Quadrimestre[] = quads.length > 0 ? quads : ["todos"];
    return lista.flatMap((q) =>
      computeResultadoFinal(
        patients, tratamentoPatients, tab3Patients, tab4Patients, tab5Patients, tab6Patients,
        q, "all", denominadorB1Data, oficialData, [],
      ).porEquipe,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, tratamentoPatients, tab3Patients, tab4Patients, tab5Patients, tab6Patients, denominadorB1Data, oficialData, quads]);

  const equipeList = useMemo(
    () => (equipeOptions.length > 0 ? equipeOptions : [...new Set(resultados.map(r => r.equipe))].sort()),
    [equipeOptions, resultados],
  );

  const indicadorOptions = useMemo(() => {
    const nomes: string[] = [];
    resultados.forEach((r: EquipeResult) =>
      r.indicadores.forEach(i => { if (!nomes.includes(i.indicador)) nomes.push(i.indicador); }),
    );
    return nomes;
  }, [resultados]);

  const { data, totalPerda } = useMemo(() => {
    const filtrados = resultados.filter(r => equipes.length === 0 || equipes.includes(r.equipe));
    const acc = new Map<string, { perda: number; peso: number; nota: number }>();

    filtrados.forEach((r) => {
      r.indicadores.forEach((ind) => {
        if (indicadoresSel.length > 0 && !indicadoresSel.includes(ind.indicador)) return;
        const atual = acc.get(ind.indicador) ?? { perda: 0, peso: 0, nota: 0 };
        atual.perda += Math.max(0, ind.peso - ind.notaFinal);
        atual.peso += ind.peso;
        atual.nota += ind.notaFinal;
        acc.set(ind.indicador, atual);
      });
    });

    const ordenado = [...acc.entries()]
      .map(([indicador, v]) => ({ indicador, ...v }))
      .sort((a, b) => b.perda - a.perda);

    const total = ordenado.reduce((s, r) => s + r.perda, 0);
    let soma = 0;
    const rows: ParetoRow[] = ordenado.map((r) => {
      soma += r.perda;
      return {
        indicador: r.indicador,
        perda: Number(r.perda.toFixed(2)),
        acumulado: total > 0 ? Number(((soma / total) * 100).toFixed(1)) : 0,
        peso: Number(r.peso.toFixed(2)),
        nota: Number(r.nota.toFixed(2)),
      };
    });
    return { data: rows, totalPerda: total };
  }, [resultados, equipes, indicadoresSel]);

  const vitaisPoucos = data.filter((r, idx) => idx === 0 || data[idx - 1].acumulado < 80);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="w-full p-4 bg-card border-2 my-0 shadow-xl rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl">
        <div className="flex items-center gap-3 w-full flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
          </div>
          <MultiSelect
            value={equipes}
            options={equipeList.map(e => ({ value: e, label: e }))}
            onChange={setEquipes}
            placeholderAll="Todas Equipes"
            width="w-[220px]"
          />
          <MultiSelect
            value={quads as string[]}
            options={QUADRIMESTRE_OPTIONS_SEM_TODOS.map(o => ({ value: o.value, label: o.label }))}
            onChange={v => setQuads(v as Quadrimestre[])}
            placeholderAll="Todos os períodos"
            width="w-[230px]"
          />
          <MultiSelect
            value={indicadoresSel}
            options={indicadorOptions.map(i => ({ value: i, label: i }))}
            onChange={setIndicadoresSel}
            placeholderAll="Todos os Indicadores"
            width="w-[260px]"
          />
        </div>
      </div>

      {/* Gráfico de Pareto */}
      <Card className="shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg">
            Gráfico de Pareto — Pontos perdidos por indicador
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Barras: pontuação perdida (peso − nota obtida). Linha: percentual acumulado.
            Total perdido: <strong>{totalPerda.toFixed(2)}</strong> ponto(s).
          </p>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Sem dados para os filtros selecionados.</p>
          ) : (
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="indicador"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    yAxisId="right" orientation="right" domain={[0, 100]} unit="%"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number, name: string) =>
                      name === "% acumulado" ? [`${value}%`, name] : [value.toFixed(2), name]
                    }
                  />
                  <Legend />
                  <Bar
                    yAxisId="left" dataKey="perda" name="Pontos perdidos"
                    fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}
                  >
                    <LabelList dataKey="perda" position="top" style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  </Bar>
                  <Line
                    yAxisId="right" type="monotone" dataKey="acumulado" name="% acumulado"
                    stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de apoio */}
      {data.length > 0 && (
        <Card className="shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Prioridades (regra 80/20)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Concentrar esforços em: <strong>{vitaisPoucos.map(v => v.indicador).join(", ")}</strong>
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Nº</th>
                  <th className="py-2 pr-4">Indicador</th>
                  <th className="py-2 pr-4">Peso somado</th>
                  <th className="py-2 pr-4">Nota obtida</th>
                  <th className="py-2 pr-4">Pontos perdidos</th>
                  <th className="py-2 pr-4">% acumulado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.indicador} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-2 pr-4">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium">{r.indicador}</td>
                    <td className="py-2 pr-4">{r.peso.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 pr-4">{r.nota.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 pr-4 font-semibold">{r.perda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 pr-4">{r.acumulado.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
