import { useState, useMemo } from "react";
import { usePatientData } from "@/hooks/usePatientData";
import { useTratamentoData } from "@/hooks/useTratamentoData";
import { useTab3Data } from "@/hooks/useTab3Data";
import { useTab4Data } from "@/hooks/useTab4Data";
import { useTab5Data } from "@/hooks/useTab5Data";
import { useTab6Data } from "@/hooks/useTab6Data";
import { useFilteredPatients, isConsultaPendente } from "@/hooks/useFilteredPatients";
import { useFilteredTratamento, isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { useFilteredTab3 } from "@/hooks/useFilteredTab3";
import { useFilteredTab4, isConsultaPendenteTab4 } from "@/hooks/useFilteredTab4";
import { useFilteredTab5 } from "@/hooks/useFilteredTab5";
import { useFilteredTab6 } from "@/hooks/useFilteredTab6";
import { useResultadoFinal } from "@/hooks/useResultadoFinal";
import { useDenominadorB1 } from "@/hooks/useDenominadorB1";
import { ResultadoFinalTab } from "@/components/dashboard/ResultadoFinalTab";
import { Quadrimestre, QUADRIMESTRE_OPTIONS } from "@/hooks/useQuadrimesterFilter";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { Tab5Table } from "@/components/dashboard/Tab5Table";
import { Tab5MonthlyCards } from "@/components/dashboard/Tab5MonthlyCards";
import { Tab5QuadrimesterCards } from "@/components/dashboard/Tab5QuadrimesterCards";
import { TratamentoTable } from "@/components/dashboard/TratamentoTable";
import { Tab4Table } from "@/components/dashboard/Tab4Table";
import { Tab6Table } from "@/components/dashboard/Tab6Table";
import { MonthlyCards } from "@/components/dashboard/MonthlyCards";
import { TratamentoMonthlyCards } from "@/components/dashboard/TratamentoMonthlyCards";
import { Tab3MonthlyCards } from "@/components/dashboard/Tab3MonthlyCards";
import { Tab4MonthlyCards } from "@/components/dashboard/Tab4MonthlyCards";
import { Tab6MonthlyCards } from "@/components/dashboard/Tab6MonthlyCards";
import { QuadrimesterCards } from "@/components/dashboard/QuadrimesterCards";
import { TratamentoQuadrimesterCards } from "@/components/dashboard/TratamentoQuadrimesterCards";
import { Tab3QuadrimesterCards } from "@/components/dashboard/Tab3QuadrimesterCards";
import { Tab4QuadrimesterCards } from "@/components/dashboard/Tab4QuadrimesterCards";
import { Tab6QuadrimesterCards } from "@/components/dashboard/Tab6QuadrimesterCards";
import { Tab3Table } from "@/components/dashboard/Tab3Table";
import { PatientFilters, FilterState } from "@/components/dashboard/PatientFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";

// ── Wrapper isolado — só monta quando todos os dados estão prontos ─────────────
const ResultadoFinalWrapper = ({
  patients, tratamentoPatients, tab3Patients, tab4Patients,
  tab5Patients, tab6Patients, quadrimestre, equipeResultado,
  denominadorB1Data, equipeOptions, onQuadrimestreChange, onEquipeChange,
}: {
  patients: Patient[];
  tratamentoPatients: TratamentoPatient[];
  tab3Patients: Tab3Record[];
  tab4Patients: Tab4Patient[];
  tab5Patients: Tab5Record[];
  tab6Patients: Tab6Record[];
  quadrimestre: Quadrimestre;
  equipeResultado: string;
  denominadorB1Data: { porEquipe: Record<string, number>; total: number };
  equipeOptions: string[];
  onQuadrimestreChange: (q: Quadrimestre) => void;
  onEquipeChange: (e: string) => void;
}) => {
  const resultadoFinal = useResultadoFinal(
    patients, tratamentoPatients, tab3Patients,
    tab4Patients, tab5Patients, tab6Patients,
    quadrimestre, equipeResultado, denominadorB1Data
  );

  return (
    <ResultadoFinalTab
      geral={resultadoFinal.geral}
      porEquipe={resultadoFinal.porEquipe}
      quadrimestre={quadrimestre}
      onQuadrimestreChange={onQuadrimestreChange}
      equipe={equipeResultado}
      onEquipeChange={onEquipeChange}
      equipeOptions={equipeOptions}
    />
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const Index = () => {
  const [activeTab, setActiveTab] = useState("consulta");

  const getCurrentQuadrimestre = (): Quadrimestre => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    if (month <= 3) return `Q1-${year}` as Quadrimestre;
    if (month <= 7) return `Q2-${year}` as Quadrimestre;
    return `Q3-${year}` as Quadrimestre;
  };

  const [quadrimestre, setQuadrimestre] = useState<Quadrimestre>(getCurrentQuadrimestre);
  const [equipeResultado, setEquipeResultado] = useState<string>("all");

  const { data: patients,           isLoading: isLoadingPatients,   error: errorPatients,   refetch: refetchPatients,   isFetching: isFetchingPatients   } = usePatientData();
  const { data: tratamentoPatients,  isLoading: isLoadingTratamento, error: errorTratamento, refetch: refetchTratamento, isFetching: isFetchingTratamento } = useTratamentoData();
  const { data: tab3Patients,        isLoading: isLoadingTab3,       error: errorTab3,       refetch: refetchTab3,       isFetching: isFetchingTab3       } = useTab3Data();
  const { data: tab4Patients,        isLoading: isLoadingTab4,       error: errorTab4,       refetch: refetchTab4,       isFetching: isFetchingTab4       } = useTab4Data();
  const { data: tab5Patients,        isLoading: isLoadingTab5,       error: errorTab5,       refetch: refetchTab5,       isFetching: isFetchingTab5       } = useTab5Data();
  const { data: tab6Patients,        isLoading: isLoadingTab6,       error: errorTab6,       refetch: refetchTab6,       isFetching: isFetchingTab6       } = useTab6Data();
  const { data: denominadorB1Data,   isLoading: isLoadingDenominadorB1 } = useDenominadorB1();

  const [filtersConsulta,   setFiltersConsulta]   = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTratamento, setFiltersTratamento] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab3,       setFiltersTab3]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab4,       setFiltersTab4]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab5,       setFiltersTab5]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab6,       setFiltersTab6]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });

  const filteredPatients         = useFilteredPatients(patients || [], filtersConsulta);
  const filteredPatientsNoQuad   = useFilteredPatients(patients || [], { ...filtersConsulta, quadrimestre: "todos" });
  const filteredTratamento       = useFilteredTratamento(tratamentoPatients || [], filtersTratamento);
  const filteredTratamentoNoQuad = useFilteredTratamento(tratamentoPatients || [], { ...filtersTratamento, quadrimestre: "todos" });
  const filteredTab3             = useFilteredTab3(tab3Patients || [], filtersTab3);
  const filteredTab4             = useFilteredTab4(tab4Patients || [], filtersTab4);
  const filteredTab4NoQuad       = useFilteredTab4(tab4Patients || [], { ...filtersTab4, quadrimestre: "todos" });
  const filteredTab5             = useFilteredTab5(tab5Patients || [], filtersTab5);
  const filteredTab6             = useFilteredTab6(tab6Patients || [], filtersTab6);

  const patientsByEquipe = useMemo(() =>
    (patients || []).filter(p => filtersConsulta.equipe === "all" || p.equipe === filtersConsulta.equipe),
    [patients, filtersConsulta.equipe]
  );

  const equipeOptions = useMemo(() => {
    const set = new Set<string>();
    (patients || []).forEach(p => p.equipe && set.add(p.equipe));
    (tratamentoPatients || []).forEach(p => p.equipe && set.add(p.equipe));
    (tab4Patients || []).forEach(p => p.equipe && set.add(p.equipe));
    (tab3Patients || []).forEach(r => r.equipe && set.add(r.equipe));
    (tab5Patients || []).forEach(r => r.equipe && set.add(r.equipe));
    (tab6Patients || []).forEach(r => r.equipe && set.add(r.equipe));
    return Array.from(set).sort();
  }, [patients, tratamentoPatients, tab3Patients, tab4Patients, tab5Patients, tab6Patients]);

  const refetchAll = () => {
    refetchPatients(); refetchTratamento(); refetchTab3();
    refetchTab4(); refetchTab5(); refetchTab6();
  };

  const getTabState = () => {
    switch (activeTab) {
      case "consulta":   return { isLoading: isLoadingPatients,   error: errorPatients,   isFetching: isFetchingPatients,   refetch: refetchPatients   };
      case "tratamento": return { isLoading: isLoadingTratamento, error: errorTratamento, isFetching: isFetchingTratamento, refetch: refetchTratamento };
      case "tab3":       return { isLoading: isLoadingTab3,       error: errorTab3,       isFetching: isFetchingTab3,       refetch: refetchTab3       };
      case "tab4":       return { isLoading: isLoadingTab4,       error: errorTab4,       isFetching: isFetchingTab4,       refetch: refetchTab4       };
      case "tab5":       return { isLoading: isLoadingTab5,       error: errorTab5,       isFetching: isFetchingTab5,       refetch: refetchTab5       };
      case "tab6":       return { isLoading: isLoadingTab6,       error: errorTab6,       isFetching: isFetchingTab6,       refetch: refetchTab6       };
      case "resultado":  return {
        isLoading: isLoadingPatients || isLoadingTratamento || isLoadingTab3 || isLoadingTab4 || isLoadingTab5 || isLoadingTab6 || isLoadingDenominadorB1,
        error: errorPatients || errorTratamento || errorTab3 || errorTab4 || errorTab5 || errorTab6,
        isFetching: isFetchingPatients || isFetchingTratamento || isFetchingTab3 || isFetchingTab4 || isFetchingTab5 || isFetchingTab6,
        refetch: refetchAll,
      };
      default: return { isLoading: false, error: null, isFetching: false, refetch: () => {} };
    }
  };

  const { error, isFetching, refetch } = getTabState();

  // Stats calculations
  const totalPatients          = patientsByEquipe.length;
  const withConsultation       = filteredPatients.filter(p => !isConsultaPendente(p.primeiraConsulta)).length;
  const totalTratamento        = filteredTratamento.filter(p => !isTratamentoPendente(p.primeiraConsulta)).length;
  const withTratamento         = filteredTratamento.filter(p => !isTratamentoPendente(p.tratamentoConcluido)).length;
  const totalExodontiasTab3    = filteredTab3.reduce((s, r) => s + r.exodontias, 0);
  const totalAtendimentosTab3  = filteredTab3.reduce((s, r) => s + r.totalAtendimentos, 0);
  const totalTab4              = filteredTab4NoQuad.length;
  const withConsultaTab4       = filteredTab4NoQuad.filter(p => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
  const totalPreventivosTab5   = filteredTab5.reduce((s, r) => s + r.preventivos, 0);
  const totalIndividuaisTab5   = filteredTab5.reduce((s, r) => s + r.totalIndividuais, 0);
  const totalExodontiasTab6    = filteredTab6.reduce((s, r) => s + r.exodontias, 0);
  const totalProcedimentosTab6 = filteredTab6.reduce((s, r) => s + r.totalProcedimentos, 0);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-destructive">Erro ao carregar dados</h1>
          <p className="text-muted-foreground">Não foi possível carregar os dados da planilha.</p>
          <Button onClick={() => refetch()} className="mt-4">Tentar novamente</Button>
        </div>
      </div>
    );
  }

  const resultadoPronto =
    !isLoadingPatients && !isLoadingTratamento && !isLoadingTab3 &&
    !isLoadingTab4 && !isLoadingTab5 && !isLoadingTab6 &&
    !isLoadingDenominadorB1 && !!denominadorB1Data && !!patients?.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-[14px] py-[20px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Monitoramento Saúde Bucal</h1>
              <p className="text-sm text-muted-foreground">Gestão de Indicadores e Metas - Varjota/CE</p>
            </div>
            <div className="flex items-center gap-3">
              {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Sincronizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="consulta" className="rounded-lg py-2.5 transition-all">1ª Consulta</TabsTrigger>
            <TabsTrigger value="tratamento" className="rounded-lg py-2.5 transition-all">Tratamento</TabsTrigger>
            <TabsTrigger value="tab3" className="rounded-lg py-2.5 transition-all">Tab 3 (ART)</TabsTrigger>
            <TabsTrigger value="tab5" className="rounded-lg py-2.5 transition-all">Tab 5 (Prev)</TabsTrigger>
            <TabsTrigger value="tab4" className="rounded-lg py-2.5 transition-all">Tab 4 (Gest)</TabsTrigger>
            <TabsTrigger value="tab6" className="rounded-lg py-2.5 transition-all">Tab 6 (Exo)</TabsTrigger>
            <TabsTrigger value="resultado" className="rounded-lg py-2.5 transition-all font-semibold text-primary">Resultado Final</TabsTrigger>
          </TabsList>

          {/* Tab 1 - Primeira Consulta */}
          <TabsContent value="consulta" className="mt-6 focus-visible:outline-none">
            <PatientFilters filters={filtersConsulta} onFilterChange={setFiltersConsulta} equipeOptions={equipeOptions} />
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
              {isLoadingPatients ? (
                <>{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
              ) : (
                <>
                  <StatsCard title="Total de Pacientes" value={totalPatients.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                  <StatsCard title="Com 1ª Consulta" value={withConsultation.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                  <QuadrimesterCards patients={filteredPatients} />
                </>
              )}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Consultas por Mês</h2>
              {isLoadingPatients
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <MonthlyCards patients={filteredPatients} />}
            </div>
            {isLoadingPatients ? <Skeleton className="h-96 rounded-xl" /> : <PatientTable patients={filteredPatients} />}
          </TabsContent>

          {/* Tab 2 - Tratamento */}
          <TabsContent value="tratamento" className="mt-6">
            <PatientFilters filters={filtersTratamento} onFilterChange={setFiltersTratamento} equipeOptions={equipeOptions} />
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
              {isLoadingTratamento ? (
                <>{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
              ) : (
                <>
                  <StatsCard title="Pacientes em Tratamento" value={totalTratamento.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                  <StatsCard title="Tratamento Concluído" value={withTratamento.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                  <TratamentoQuadrimesterCards patients={filteredTratamento} />
                </>
              )}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Conclusões por Mês</h2>
              {isLoadingTratamento
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <TratamentoMonthlyCards patients={filteredTratamento} />}
            </div>
            {isLoadingTratamento ? <Skeleton className="h-96 rounded-xl" /> : <TratamentoTable patients={filteredTratamento} />}
          </TabsContent>

          {/* Tab 3 - ART */}
          <TabsContent value="tab3" className="mt-6">
            <PatientFilters filters={filtersTab3} onFilterChange={setFiltersTab3} equipeOptions={equipeOptions} />
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTab3 ? (
                <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
              ) : (
                <>
                  <StatsCard title="Total Atendimentos" value={totalAtendimentosTab3.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                  <StatsCard title="Total ART" value={totalExodontiasTab3.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                  <Tab3QuadrimesterCards records={filteredTab3} />
                </>
              )}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">ART por Mês</h2>
              {isLoadingTab3
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <Tab3MonthlyCards records={filteredTab3} />}
            </div>
            {isLoadingTab3 ? <Skeleton className="h-96 rounded-xl" /> : <Tab3Table records={filteredTab3} />}
          </TabsContent>

          {/* Tab 5 - Preventivos */}
          <TabsContent value="tab5" className="mt-6">
            <PatientFilters filters={filtersTab5} onFilterChange={setFiltersTab5} equipeOptions={equipeOptions} />
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTab5 ? (
                <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
              ) : (
                <>
                  <StatsCard title="Total Atendimentos" value={totalIndividuaisTab5.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                  <StatsCard title="Total Preventivos" value={totalPreventivosTab5.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                  <Tab5QuadrimesterCards records={filteredTab5} />
                </>
              )}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Preventivos por Mês</h2>
              {isLoadingTab5
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <Tab5MonthlyCards records={filteredTab5} />}
            </div>
            {isLoadingTab5 ? <Skeleton className="h-96 rounded-xl" /> : <Tab5Table records={filteredTab5} />}
          </TabsContent>

          {/* Tab 4 - Gestantes */}
          <TabsContent value="tab4" className="mt-6">
            <PatientFilters filters={filtersTab4} onFilterChange={setFiltersTab4} equipeOptions={equipeOptions} />
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
              {isLoadingTab4 ? (
                <>{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
              ) : (
                <>
                  <StatsCard title="Total de Gestantes" value={totalTab4.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                  <StatsCard title="Com 1ª Consulta" value={withConsultaTab4.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                  <QuadrimesterCards patients={filteredTab4 as any} isTab4 />
                </>
              )}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Consultas por Mês</h2>
              {isLoadingTab4
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <Tab4MonthlyCards patients={filteredTab4} />}
            </div>
            {isLoadingTab4 ? <Skeleton className="h-96 rounded-xl" /> : <Tab4Table patients={filteredTab4} />}
          </TabsContent>

          {/* Tab 6 - Exodontias */}
          <TabsContent value="tab6" className="mt-6">
            <PatientFilters filters={filtersTab6} onFilterChange={setFiltersTab6} equipeOptions={equipeOptions} />
            <div id="dashboard-content-tab6">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTab6 ? (
                  <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</>
                ) : (
                  <>
                    <StatsCard title="Total Procedimentos" value={totalProcedimentosTab6.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="TRA" value={totalExodontiasTab6.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <Tab6QuadrimesterCards records={filteredTab6} />
                  </>
                )}
              </div>
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Exodontias por Mês</h2>
                {isLoadingTab6
                  ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                  : <Tab6MonthlyCards records={filteredTab6} />}
              </div>
              {isLoadingTab6 ? <Skeleton className="h-96 rounded-xl" /> : <Tab6Table records={filteredTab6} />}
            </div>
          </TabsContent>

          {/* Tab 7 - Resultado Final */}
          <TabsContent value="resultado" className="mt-6">
            {!resultadoPronto ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
            ) : (
              <ResultadoFinalWrapper
                patients={patients!}
                tratamentoPatients={tratamentoPatients ?? []}
                tab3Patients={tab3Patients ?? []}
                tab4Patients={tab4Patients ?? []}
                tab5Patients={tab5Patients ?? []}
                tab6Patients={tab6Patients ?? []}
                quadrimestre={quadrimestre}
                equipeResultado={equipeResultado}
                denominadorB1Data={denominadorB1Data!}
                equipeOptions={equipeOptions}
                onQuadrimestreChange={setQuadrimestre}
                onEquipeChange={setEquipeResultado}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/50 bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Secretaria Municipal de Saúde de Varjota - 2026 • Desenvolvido por Alidemberg Araújo - Coordenador do e-SUS Municipal</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
 
