import { usePatientData } from "@/hooks/usePatientData";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { GenderChart } from "@/components/dashboard/GenderChart";
import { AgeChart } from "@/components/dashboard/AgeChart";
import { MicroareaChart } from "@/components/dashboard/MicroareaChart";
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { data: patients, isLoading, error, refetch, isFetching } = usePatientData();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
      </div>
    );
  }

  const totalPatients = patients?.length || 0;
  const withConsultation = patients?.filter(
    (p) => !p.comPrimeiraConsulta.includes("NÃO")
  ).length || 0;
  const withoutConsultation = totalPatients - withConsultation;
  const uniqueMicroareas = new Set(patients?.map((p) => p.microarea)).size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Dashboard ESF Pedreiras
              </h1>
              <p className="mt-1 text-muted-foreground">
                Acompanhamento de pacientes e indicadores de saúde
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar dados
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title="Total de Pacientes"
                value={totalPatients.toLocaleString("pt-BR")}
                icon={Users}
                variant="primary"
              />
              <StatsCard
                title="Com 1ª Consulta"
                value={withConsultation.toLocaleString("pt-BR")}
                icon={UserCheck}
                variant="success"
              />
              <StatsCard
                title="Sem 1ª Consulta"
                value={withoutConsultation.toLocaleString("pt-BR")}
                icon={UserX}
                variant="warning"
              />
              <StatsCard
                title="Microáreas Ativas"
                value={uniqueMicroareas}
                icon={Activity}
                variant="secondary"
              />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          {isLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <GenderChart patients={patients || []} />
              <AgeChart patients={patients || []} />
              <MicroareaChart patients={patients || []} />
            </>
          )}
        </div>

        {/* Patient Table */}
        {isLoading ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : (
          <PatientTable patients={patients || []} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Dashboard de Saúde • ESF Pedreiras • Dados atualizados em tempo real</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
