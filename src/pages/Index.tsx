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
import { ResultadoFinalTab } from "@/components/dashboard/ResultadoFinalTab";
import { Quadrimestre, QUADRIMESTRE_OPTIONS, QUADRIMESTRE_ATUAL } from "@/hooks/useQuadrimesterFilter";
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

const Index = () => {
  const [activeTab, setActiveTab] = useState("consulta");
  const [quadrimestreResultado, setQuadrimestreResultado] = useState<Quadrimestre>(QUADRIMESTRE_ATUAL);
  const [equipeResultado, setEquipeResultado] = useState<string>("all");

  const { data: patients, isLoading: isLoadingPatients, error: errorPatients, refetch: refetchPatients, isFetching: isFetchingPatients } = usePatientData();
  const { data: tratamentoPatients, isLoading: isLoadingTratamento, error: errorTratamento, refetch: refetchTratamento, isFetching: isFetchingTratamento } = useTratamentoData();
  const { data: tab3Patients, isLoading: isLoadingTab3, error: errorTab3, refetch: refetchTab3, isFetching: isFetchingTab3 } = useTab3Data();
  const { data: tab4Patients, isLoading: isLoadingTab4, error: errorTab4, refetch: refetchTab4, isFetching: isFetchingTab4 } = useTab4Data();
  const { data: tab5Patients, isLoading: isLoadingTab5, error: errorTab5, refetch: refetchTab5, isFetching: isFetchingTab5 } = useTab5Data();
  const { data: tab6Patients, isLoading: isLoadingTab6, error: errorTab6, refetch: refetchTab6, isFetching: isFetchingTab6 } = useTab6Data();

  const [filtersConsulta, setFiltersConsulta] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTratamento, setFiltersTratamento] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab3, setFiltersTab3] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab4, setFiltersTab4] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab5, setFiltersTab5] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab6, setFiltersTab6] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });

  const filteredPatients = useFilteredPatients(patients || [], filtersConsulta);
  const filteredPatientsNoQuad = useFilteredPatients(patients || [], { ...filtersConsulta, quadrimestre: "todos" });
  const filteredTratamento = useFilteredTratamento(tratamentoPatients || [], filtersTratamento);
  const filteredTratamentoNoQuad = useFilteredTratamento(tratamentoPatients || [], { ...filtersTratamento, quadrimestre: "todos" });
  const filteredTab3 = useFilteredTab3(tab3Patients || [], filtersTab3);
  const filteredTab4 = useFilteredTab4(tab4Patients || [], filtersTab4);
  const filteredTab4NoQuad = useFilteredTab4(tab4Patients || [], { ...filtersTab4, quadrimestre: "todos" });
  const filteredTab5 = useFilteredTab5(tab5Patients || [], filtersTab5);
  const filteredTab6 = useFilteredTab6(tab6Patients || [], filtersTab6);

  const patientsByEquipe = useMemo(() =>
    (patients || []).filter(p => filtersConsulta.equipe === "all" || p.equipe === filtersConsulta.equipe),
    [patients, filtersConsulta.equipe]
  );
  const tratamentoByEquipe = useMemo(() =>
    (tratamentoPatients || []).filter(p => filtersTratamento.equipe === "all" || p.equipe === filtersTratamento.equipe),
    [tratamentoPatients, filtersTratamento.equipe]
  );

  const refetchAll = () => { refetchPatients(); refetchTratamento(); refetchTab3(); refetchTab4(); refetchTab5(); refetchTab6(); };

  const getTabState = () => {
    switch (activeTab) {
      case "consulta": return { isLoading: isLoadingPatients, error: errorPatients, isFetching: isFetchingPatients, refetch: refetchPatients };
      case "tratamento": return { isLoading: isLoadingTratamento, error: errorTratamento, isFetching: isFetchingTratamento, refetch: refetchTratamento };
      case "tab3": return { isLoading: isLoadingTab3, error: errorTab3, isFetching: isFetchingTab3, refetch: refetchTab3 };
      case "tab4": return { isLoading: isLoadingTab4, error: errorTab4, isFetching: isFetchingTab4, refetch: refetchTab4 };
      case "tab5": return { isLoading: isLoadingTab5, error: errorTab5, isFetching: isFetchingTab5, refetch: refetchTab5 };
      case "tab6": return { isLoading: isLoadingTab6, error: errorTab6, isFetching: isFetchingTab6, refetch: refetchTab6 };
      case "resultado": return {
        isLoading: isLoadingPatients || isLoadingTratamento || isLoadingTab3 || isLoadingTab4 || isLoadingTab5 || isLoadingTab6,
        error: errorPatients || errorTratamento || errorTab3 || errorTab4 || errorTab5 || errorTab6,
        isFetching: isFetchingPatients || isFetchingTratamento || isFetchingTab3 || isFetchingTab4 || isFetchingTab5 || isFetchingTab6,
        refetch: refetchAll
      };
      default: return { isLoading: false, error: null, isFetching: false, refetch: () => {} };
    }
  };

  const { error, isFetching, refetch } = getTabState();

  const isAllLoaded = !isLoadingPatients && !isLoadingTratamento && !isLoadingTab3 && !isLoadingTab4 && !isLoadingTab5 && !isLoadingTab6;

  const allEquipes = useMemo(() => {
    const set = new Set<string>();
    (patients || []).forEach(p => p.equipe && set.add(p.equipe));
    (tratamentoPatients || []).forEach(p => p.equipe && set.add(p.equipe));
    (tab3Patients || []).forEach(r => set.add(r.equipe));
    (tab4Patients || []).forEach(p => p.equipe && set.add(p.equipe));
    (tab5Patients || []).forEach(r => set.add(r.equipe));
    (tab6Patients || []).forEach(r => set.add(r.equipe));
    return Array.from(set).sort();
  }, [patients, tratamentoPatients, tab3Patients, tab4Patients, tab5Patients, tab6Patients]);

  const resultadoFinal = useResultadoFinal(
    patients || [], tratamentoPatients || [], tab3Patients || [],
    tab4Patients || [], tab5Patients || [], tab6Patients || [],
    quadrimestreResultado, equipeResultado
  );

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-destructive">Erro ao carregar dados</h1>
        <p className="text-muted-foreground">Não foi possível carregar os dados da planilha.</p>
        <Button onClick={() => refetch()} className="mt-4">Tentar novamente</Button>
      </div>
    </div>;
  }

  // Stats calculations
  const totalPatients = patientsByEquipe.length;
  const withConsultation = filteredPatients.filter(p => !isConsultaPendente(p.primeiraConsulta)).length;
  const totalTratamento = filteredTratamento.filter(p => !isTratamentoPendente(p.primeiraConsulta)).length;
  const withTratamento = filteredTratamento.filter(p => !isTratamentoPendente(p.tratamentoConcluido)).length;
  const totalTab3 = filteredTab3.length;
  const totalExodontiasTab3 = filteredTab3.reduce((s, r) => s + r.exodontias, 0);
  const totalAtendimentosTab3 = filteredTab3.reduce((s, r) => s + r.totalAtendimentos, 0);
  const totalTab4 = filteredTab4NoQuad.length;
  const withConsultaTab4 = filteredTab4NoQuad.filter(p => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
  const totalTab5 = filteredTab5.length;
  const totalPreventivosTab5 = filteredTab5.reduce((s, r) => s + r.preventivos, 0);
  const totalIndividuaisTab5 = filteredTab5.reduce((s, r) => s + r.totalIndividuais, 0);
  const totalTab6 = filteredTab6.length;
  const totalExodontiasTab6 = filteredTab6.reduce((s, r) => s + r.exodontias, 0);
  const totalProcedimentosTab6 = filteredTab6.reduce((s, r) => s + r.totalProcedimentos, 0);

  return <div className="min-h-screen bg-background">
    <header className="border-b border-border/50 bg-card shadow-sm">
      <div className="container mx-auto px-[14px] py-[20px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl ml-0 mt-0 mr-0">
              Indicadores de Saúde Bucal de Varjota
            </h1>
            <p className="mt-1 text-muted-foreground">Painel de Monitoramento da Saúde Bucal</p>
          </div>
          <Button variant="outline" onClick={refetchAll} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar dados
          </Button>
        </div>
      </div>
    </header>

    <main className="container mx-auto px-4 rounded-none py-[26px]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1 mx-auto justify-center">
          <TabsTrigger value="consulta" className="text-xs px-2 py-1.5 flex-1 min-w-fit">1ª Consulta Odontológica</TabsTrigger>
          <TabsTrigger value="tratamento" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Tratamento Concluído</TabsTrigger>
          <TabsTrigger value="tab3" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Taxa Exodontias</TabsTrigger>
          <TabsTrigger value="tab4" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Escovação Supervisionada</TabsTrigger>
          <TabsTrigger value="tab5" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Proced. Odont. Preventivos</TabsTrigger>
          <TabsTrigger value="tab6" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Trat. Restaurador Atraumático</TabsTrigger>
          <TabsTrigger value="resultado" className="text-xs px-2 py-1.5 flex-1 min-w-fit font-semibold">📊 Resultado Final</TabsTrigger>
        </TabsList>

        {/* Tab 1 - 1ª Consulta */}
        <TabsContent value="consulta" className="mt-6">
          {!isLoadingPatients && patients && <div className="mb-6">
            <PatientFilters
              patients={patients}
              filters={filtersConsulta}
              onFiltersChange={setFiltersConsulta}
              contentId="dashboard-content-consulta"
              pdfTitle="1ª Consulta Odontológica"
              pdfFileName="1a-consulta-odontologica"
              pdfSummaryCards={[
                { label: "Total de Pacientes", value: totalPatients.toLocaleString("pt-BR") },
                { label: "Com 1ª Consulta", value: withConsultation.toLocaleString("pt-BR"), percentage: `${totalPatients > 0 ? ((withConsultation / totalPatients) * 100).toFixed(1) : 0}%` },
              ]}
              pdfColumns={[
                { key: "num", header: "Nº" }, { key: "equipe", header: "Equipe" }, { key: "microarea", header: "Microárea" },
                { key: "nome", header: "Nome" }, { key: "cpfCns", header: "CPF/CNS" }, { key: "idade", header: "Idade" },
                { key: "sexo", header: "Sexo" }, { key: "primeiraConsulta", header: "1ª Consulta" }, { key: "status", header: "Status" },
              ]}
              pdfData={filteredPatientsNoQuad.map((p, i) => ({
                num: i + 1, equipe: p.equipe || "-", microarea: p.microarea, nome: p.nome,
                cpfCns: p.cpfCns || "-", idade: `${p.idade} anos`, sexo: p.sexo === "Feminino" ? "F" : "M",
                primeiraConsulta: p.primeiraConsulta === "-" ? "Sem registro" : p.primeiraConsulta,
                status: isConsultaPendente(p.primeiraConsulta) ? "Pendente" : "Concluído",
              }))}
            />
          </div>}
          <div id="dashboard-content-consulta">
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingPatients ? <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</> : <>
                <StatsCard title="Total de Pacientes" value={totalPatients.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                <StatsCard title="Com 1ª Consulta" value={withConsultation.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                <QuadrimesterCards patients={filteredPatients} totalPatients={patientsByEquipe.length} quadFiltered={filtersConsulta.quadrimestre} />
              </>}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Consultas por Mês (Últimos 12 meses)</h2>
              {isLoadingPatients
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <MonthlyCards patients={filteredPatients} totalPatients={patientsByEquipe.length} quadrimestre={filtersConsulta.quadrimestre} />}
            </div>
            {isLoadingPatients ? <Skeleton className="h-96 rounded-xl" /> : <PatientTable patients={filteredPatientsNoQuad} />}
          </div>
        </TabsContent>

        {/* Tab 2 - Tratamento Concluído */}
        <TabsContent value="tratamento" className="mt-6">
          {!isLoadingTratamento && tratamentoPatients && <div className="mb-6">
            <PatientFilters
              patients={tratamentoPatients as any}
              filters={filtersTratamento}
              onFiltersChange={setFiltersTratamento}
              contentId="dashboard-content-tratamento"
              pdfTitle="Tratamento Concluído"
              pdfFileName="tratamento-concluido"
              pdfSummaryCards={[
                { label: "Total de Pacientes", value: totalTratamento.toLocaleString("pt-BR") },
                { label: "Com Tratamento", value: withTratamento.toLocaleString("pt-BR"), percentage: `${totalTratamento > 0 ? ((withTratamento / totalTratamento) * 100).toFixed(1) : 0}%` },
              ]}
              pdfColumns={[
                { key: "num", header: "Nº" }, { key: "equipe", header: "Equipe" }, { key: "microarea", header: "Microárea" },
                { key: "nome", header: "Nome" }, { key: "cpfCns", header: "CPF/CNS" }, { key: "idade", header: "Idade" },
                { key: "sexo", header: "Sexo" }, { key: "primeiraConsulta", header: "1ª Consulta" },
                { key: "tratamentoConcluido", header: "Tratamento Concluído" }, { key: "status", header: "Status" },
              ]}
              pdfData={filteredTratamentoNoQuad.map((p, i) => ({
                num: i + 1, equipe: p.equipe || "-", microarea: p.microarea, nome: p.nome,
                cpfCns: p.cpfCns || "-", idade: `${p.idade} anos`, sexo: p.sexo === "Masculino" ? "M" : "F",
                primeiraConsulta: p.primeiraConsulta, tratamentoConcluido: p.tratamentoConcluido,
                status: isTratamentoPendente(p.tratamentoConcluido) ? "Pendente" : "Concluído",
              }))}
            />
          </div>}
          <div id="dashboard-content-tratamento">
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTratamento ? <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</> : <>
                <StatsCard title="Pacientes com 1ª Consulta" value={totalTratamento.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                <StatsCard title="Com Tratamento" value={withTratamento.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                <TratamentoQuadrimesterCards
                  patients={filteredTratamento}
                  allPatients={filteredTratamentoNoQuad}
                  totalComConsulta={filteredTratamento.filter(p => !isTratamentoPendente(p.primeiraConsulta)).length}
                />
              </>}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Tratamentos Odontológicos Concluídos por Mês (Últimos 12 meses)</h2>
              {isLoadingTratamento
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <TratamentoMonthlyCards patients={filteredTratamento} allPatients={filteredTratamentoNoQuad} />}
            </div>
            {isLoadingTratamento ? <Skeleton className="h-96 rounded-xl" /> : <TratamentoTable patients={filteredTratamentoNoQuad} />}
          </div>
        </TabsContent>

        {/* Tab 3 - Taxa Exodontias */}
        <TabsContent value="tab3" className="mt-6">
          {!isLoadingTab3 && tab3Patients && <div className="mb-6">
            <PatientFilters
              patients={tab3Patients as any}
              filters={filtersTab3}
              onFiltersChange={setFiltersTab3}
              contentId="dashboard-content-tab3"
              pdfTitle="Taxa de Exodontias"
              pdfFileName="taxa-exodontias"
              pdfSummaryCards={[
                { label: "Total de Registros", value: totalAtendimentosTab3.toLocaleString("pt-BR") },
                { label: "Exodontias", value: totalExodontiasTab3.toLocaleString("pt-BR"), percentage: `${totalAtendimentosTab3 > 0 ? ((totalExodontiasTab3 / totalAtendimentosTab3) * 100).toFixed(1) : 0}%` },
              ]}
              pdfColumns={[
                { key: "num", header: "Nº" }, { key: "mesAno", header: "Mês/Ano" }, { key: "equipe", header: "Equipe" },
                { key: "exodontias", header: "Exodontias" }, { key: "totalAtendimentos", header: "Total Atendimentos" }, { key: "porcentagem", header: "Pontuação" },
              ]}
              pdfData={filteredTab3.map((r, i) => ({
                num: i + 1, mesAno: r.mesAno, equipe: r.equipe,
                exodontias: r.exodontias, totalAtendimentos: r.totalAtendimentos, porcentagem: `${r.porcentagem.toFixed(2)}%`,
              }))}
            />
          </div>}
          <div id="dashboard-content-tab3">
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTab3 ? <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</> : <>
                <StatsCard title="Total de Registros" value={totalAtendimentosTab3.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                <StatsCard title="Exodontias" value={totalExodontiasTab3.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                <Tab3QuadrimesterCards records={filteredTab3} />
              </>}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Exodontias por Mês</h2>
              {isLoadingTab3
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <Tab3MonthlyCards records={filteredTab3} />}
            </div>
            {isLoadingTab3 ? <Skeleton className="h-96 rounded-xl" /> : <Tab3Table records={filteredTab3} />}
          </div>
        </TabsContent>

        {/* Tab 4 - Escovação Supervisionada */}
        <TabsContent value="tab4" className="mt-6">
          {!isLoadingTab4 && tab4Patients && <div className="mb-6">
            <PatientFilters
              patients={tab4Patients as any}
              filters={filtersTab4}
              onFiltersChange={setFiltersTab4}
              contentId="dashboard-content-tab4"
              pdfTitle="Escovação Supervisionada"
              pdfFileName="escovacao-supervisionada"
              pdfSummaryCards={[
                { label: "Total de Pacientes", value: totalTab4.toLocaleString("pt-BR") },
                { label: "Com Escovação", value: withConsultaTab4.toLocaleString("pt-BR"), percentage: `${totalTab4 > 0 ? ((withConsultaTab4 / totalTab4) * 100).toFixed(1) : 0}%` },
              ]}
              pdfColumns={[
                { key: "num", header: "Nº" }, { key: "equipe", header: "Equipe" }, { key: "microarea", header: "Microárea" },
                { key: "nome", header: "Nome" }, { key: "cpfCns", header: "CPF/CNS" }, { key: "idade", header: "Idade" },
                { key: "sexo", header: "Sexo" }, { key: "primeiraConsulta", header: "Escovação Supervisionada" }, { key: "status", header: "Status" },
              ]}
              pdfData={filteredTab4.map((p, i) => ({
                num: i + 1, equipe: p.equipe || "-", microarea: p.microarea, nome: p.nome,
                cpfCns: p.cpfCns || "-", idade: `${p.idade} anos`, sexo: p.sexo === "Feminino" ? "F" : "M",
                primeiraConsulta: p.primeiraConsulta === "-" ? "Sem registro" : p.primeiraConsulta,
                status: isConsultaPendenteTab4(p.primeiraConsulta) ? "Pendente" : "Concluído",
              }))}
            />
          </div>}
          <div id="dashboard-content-tab4">
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTab4 ? <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</> : <>
                <StatsCard title="Total de Pacientes" value={totalTab4.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                <StatsCard title="Crianças de 6 a 12 anos participante" value={withConsultaTab4.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                <Tab4QuadrimesterCards patients={filteredTab4} totalPatients={filteredTab4NoQuad.length} />
              </>}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Consultas por Mês (Últimos 12 meses)</h2>
              {isLoadingTab4
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <Tab4MonthlyCards patients={filteredTab4} totalPatients={filteredTab4NoQuad.length} />}
            </div>
            {isLoadingTab4 ? <Skeleton className="h-96 rounded-xl" /> : <Tab4Table patients={filteredTab4} />}
          </div>
        </TabsContent>

        {/* Tab 5 - Proced. Odont. Preventivos */}
        <TabsContent value="tab5" className="mt-6">
          {!isLoadingTab5 && tab5Patients && <div className="mb-6">
            <PatientFilters
              patients={tab5Patients as any}
              filters={filtersTab5}
              onFiltersChange={setFiltersTab5}
              contentId="dashboard-content-tab5"
              pdfTitle="Procedimentos Odontológicos Preventivos"
              pdfFileName="procedimentos-preventivos"
              pdfSummaryCards={[
                { label: "Total de Registros", value: totalTab5.toLocaleString("pt-BR") },
                { label: "Preventivos", value: totalPreventivosTab5.toLocaleString("pt-BR"), percentage: `${totalIndividuaisTab5 > 0 ? ((totalPreventivosTab5 / totalIndividuaisTab5) * 100).toFixed(1) : 0}%` },
              ]}
              pdfColumns={[
                { key: "num", header: "Nº" }, { key: "mesAno", header: "Mês/Ano" }, { key: "equipe", header: "Equipe" },
                { key: "preventivos", header: "Preventivos" }, { key: "totalIndividuais", header: "Total Individuais" }, { key: "porcentagem", header: "Pontuação" },
              ]}
              pdfData={filteredTab5.map((r, i) => ({
                num: i + 1, mesAno: r.mesAno, equipe: r.equipe,
                preventivos: r.preventivos, totalIndividuais: r.totalIndividuais, porcentagem: `${r.porcentagem.toFixed(2)}%`,
              }))}
            />
          </div>}
          <div id="dashboard-content-tab5">
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTab5 ? <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</> : <>
                <StatsCard title="Total de Registros" value={totalIndividuaisTab5.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                <StatsCard title="Preventivos" value={totalPreventivosTab5.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                <Tab5QuadrimesterCards records={filteredTab5} />
              </>}
            </div>
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Procedimentos Preventivos por Mês</h2>
              {isLoadingTab5
                ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">{[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
                : <Tab5MonthlyCards records={filteredTab5} />}
            </div>
            {isLoadingTab5 ? <Skeleton className="h-96 rounded-xl" /> : <Tab5Table records={filteredTab5} />}
          </div>
        </TabsContent>

        {/* Tab 6 - Trat. Restaurador Atraumático */}
        <TabsContent value="tab6" className="mt-6">
          {!isLoadingTab6 && tab6Patients && <div className="mb-6">
            <PatientFilters
              patients={tab6Patients as any}
              filters={filtersTab6}
              onFiltersChange={setFiltersTab6}
              contentId="dashboard-content-tab6"
              pdfTitle="Tratamento Restaurador Atraumático"
              pdfFileName="tratamento-restaurador"
              pdfSummaryCards={[
                { label: "Total de Registros", value: totalTab6.toLocaleString("pt-BR") },
                { label: "Exodontias", value: totalExodontiasTab6.toLocaleString("pt-BR"), percentage: `${totalProcedimentosTab6 > 0 ? ((totalExodontiasTab6 / totalProcedimentosTab6) * 100).toFixed(1) : 0}%` },
              ]}
              pdfColumns={[
                { key: "num", header: "Nº" }, { key: "mesAno", header: "Mês/Ano" }, { key: "equipe", header: "Equipe" },
                { key: "exodontias", header: "Exodontias" }, { key: "totalProcedimentos", header: "Total Procedimentos" }, { key: "porcentagem", header: "Pontuação" },
              ]}
              pdfData={filteredTab6.map((r, i) => ({
                num: i + 1, mesAno: r.mesAno, equipe: r.equipe,
                exodontias: r.exodontias, totalProcedimentos: r.totalProcedimentos, porcentagem: `${r.porcentagem.toFixed(2)}%`,
              }))}
            />
          </div>}
          <div id="dashboard-content-tab6">
            <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
              {isLoadingTab6 ? <>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</> : <>
                <StatsCard title="Total Procedimentos" value={totalProcedimentosTab6.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                <StatsCard title="TRA" value={totalExodontiasTab6.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                <Tab6QuadrimesterCards records={filteredTab6} />
              </>}
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
          {!isAllLoaded ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : (
            <ResultadoFinalTab
              geral={resultadoFinal.geral}
              porEquipe={resultadoFinal.porEquipe}
              quadrimestre={quadrimestreResultado}
              onQuadrimestreChange={setQuadrimestreResultado}
              equipe={equipeResultado}
              onEquipeChange={setEquipeResultado}
              equipeOptions={allEquipes}
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
  </div>;
};

export default Index;
