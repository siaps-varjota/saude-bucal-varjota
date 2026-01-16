import { useState } from "react";
import { usePatientData } from "@/hooks/usePatientData";
import { useFilteredPatients } from "@/hooks/useFilteredPatients";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { MonthlyCards } from "@/components/dashboard/MonthlyCards";
import { PatientFilters, FilterState } from "@/components/dashboard/PatientFilters";
import { Users, UserCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";
const Index = () => {
  const {
    data: patients,
    isLoading,
    error,
    refetch,
    isFetching
  } = usePatientData();
  const [filters, setFilters] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });
  const filteredPatients = useFilteredPatients(patients || [], filters);
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
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
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

      <main className="container mx-auto px-4 py-8 rounded-none">
        {/* Global Filters */}
        {!isLoading && patients && <div className="mb-6">
            <PatientFilters patients={patients} filters={filters} onFiltersChange={setFilters} />
          </div>}

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {isLoading ? <>
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </> : <>
              <StatsCard title="Total de Pacientes" value={totalPatients.toLocaleString("pt-BR")} icon={Users} variant="primary" />
              <StatsCard title="Com 1ª Consulta" value={withConsultation.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
            </>}
        </div>

        {/* Monthly Cards */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Consultas por Mês (Últimos 12 meses)
          </h2>
          {isLoading ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
              {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div> : <MonthlyCards patients={filteredPatients} />}
        </div>

        {/* Patient Table */}
        {isLoading ? <Skeleton className="h-96 rounded-xl" /> : <PatientTable patients={filteredPatients} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Secretaria Municipal de Saúde de Varjota - 2026 • Desenvolvido por Alidemberg Araújo</p>
        </div>
      </footer>
    </div>;
};
export default Index;