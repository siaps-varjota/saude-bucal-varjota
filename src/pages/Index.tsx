import { useState } from "react";
import { usePatientData } from "@/hooks/usePatientData";
import { useTratamentoData } from "@/hooks/useTratamentoData";
import { useFilteredPatients } from "@/hooks/useFilteredPatients";
import { useFilteredTratamento, isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { TratamentoTable } from "@/components/dashboard/TratamentoTable";
import { MonthlyCards } from "@/components/dashboard/MonthlyCards";
import { TratamentoMonthlyCards } from "@/components/dashboard/TratamentoMonthlyCards";
import { QuadrimesterCards } from "@/components/dashboard/QuadrimesterCards";
import { TratamentoQuadrimesterCards } from "@/components/dashboard/TratamentoQuadrimesterCards";
import { PatientFilters, FilterState } from "@/components/dashboard/PatientFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";
const Index = () => {
  const [activeTab, setActiveTab] = useState("consulta");
  const {
    data: patients,
    isLoading: isLoadingPatients,
    error: errorPatients,
    refetch: refetchPatients,
    isFetching: isFetchingPatients
  } = usePatientData();
  const {
    data: tratamentoPatients,
    isLoading: isLoadingTratamento,
    error: errorTratamento,
    refetch: refetchTratamento,
    isFetching: isFetchingTratamento
  } = useTratamentoData();
  const [filtersConsulta, setFiltersConsulta] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });
  const [filtersTratamento, setFiltersTratamento] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });
  const filteredPatients = useFilteredPatients(patients || [], filtersConsulta);
  const filteredTratamento = useFilteredTratamento(tratamentoPatients || [], filtersTratamento);
  const isLoading = activeTab === "consulta" ? isLoadingPatients : isLoadingTratamento;
  const error = activeTab === "consulta" ? errorPatients : errorTratamento;
  const isFetching = activeTab === "consulta" ? isFetchingPatients : isFetchingTratamento;
  const refetch = activeTab === "consulta" ? refetchPatients : refetchTratamento;
  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-destructive">
            Erro ao carregar dados
          </h1>
          <p className="text-muted-foreground">
            Não foi possível carregar os dados da planilha.
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </div>;
  }
  const totalPatients = filteredPatients.length;
  const withConsultation = filteredPatients.filter(p => !isConsultaPendente(p.primeiraConsulta)).length;
  const totalTratamento = filteredTratamento.length;
  const withTratamento = filteredTratamento.filter(p => !isTratamentoPendente(p.tratamentoConcluido)).length;
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-px py-[10px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Indicadores de Saúde Bucal de Varjota</h1>
              <p className="mt-1 text-muted-foreground">
                Painel de Monitoramento da Saúde Bucal
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar dados
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 rounded-none py-[20px]">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="consulta">1ª Consulta</TabsTrigger>
            <TabsTrigger value="tratamento">Tratamento Concluído</TabsTrigger>
          </TabsList>
          
          <TabsContent value="consulta" className="mt-6">
            {/* Filters for Consulta */}
            {!isLoadingPatients && patients && <div className="mb-6">
                <PatientFilters patients={patients} filters={filtersConsulta} onFiltersChange={setFiltersConsulta} />
              </div>}

            <div id="dashboard-content-consulta">
              {/* Stats Cards */}
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingPatients ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalPatients.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com 1ª Consulta" value={withConsultation.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <QuadrimesterCards patients={filteredPatients} />
                  </>}
              </div>

              {/* Monthly Cards */}
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Consultas por Mês (Últimos 12 meses)
                </h2>
                {isLoadingPatients ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <MonthlyCards patients={filteredPatients} />}
              </div>

              {/* Patient Table */}
              {isLoadingPatients ? <Skeleton className="h-96 rounded-xl" /> : <PatientTable patients={filteredPatients} />}
            </div>
          </TabsContent>
          
          <TabsContent value="tratamento" className="mt-6">
            {/* Filters for Tratamento */}
            {!isLoadingTratamento && tratamentoPatients && <div className="mb-6">
                <PatientFilters patients={tratamentoPatients as any} filters={filtersTratamento} onFiltersChange={setFiltersTratamento} />
              </div>}

            <div id="dashboard-content-tratamento">
              {/* Stats Cards */}
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTratamento ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalTratamento.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com Tratamento" value={withTratamento.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <TratamentoQuadrimesterCards patients={filteredTratamento} />
                  </>}
              </div>

              {/* Monthly Cards */}
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Tratamentos Odontológicos Concluídos por Mês (Últimos 12 meses)</h2>
                {isLoadingTratamento ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <TratamentoMonthlyCards patients={filteredTratamento} />}
              </div>

              {/* Tratamento Table */}
              {isLoadingTratamento ? <Skeleton className="h-96 rounded-xl" /> : <TratamentoTable patients={filteredTratamento} />}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Secretaria Municipal de Saúde de Varjota - 2026 • Desenvolvido por Alidemberg Araújo - Coordenador do e-SUS local</p>
        </div>
      </footer>
    </div>;
};
export default Index;