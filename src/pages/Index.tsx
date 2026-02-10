import { useState } from "react";
import { usePatientData } from "@/hooks/usePatientData";
import { useTratamentoData } from "@/hooks/useTratamentoData";
import { useTab3Data } from "@/hooks/useTab3Data";
import { useTab4Data } from "@/hooks/useTab4Data";
import { useTab5Data } from "@/hooks/useTab5Data";
import { useTab6Data } from "@/hooks/useTab6Data";
import { useFilteredPatients, isConsultaPendente } from "@/hooks/useFilteredPatients";
import { useFilteredTratamento, isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { useFilteredTab3, isExodontiaPendente } from "@/hooks/useFilteredTab3";
import { useFilteredTab4, isConsultaPendenteTab4 } from "@/hooks/useFilteredTab4";
import { useFilteredTab5, isConsultaPendenteTab5 } from "@/hooks/useFilteredTab5";
import { useFilteredTab6, isConsultaPendenteTab6 } from "@/hooks/useFilteredTab6";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PatientTable } from "@/components/dashboard/PatientTable";
import { TratamentoTable } from "@/components/dashboard/TratamentoTable";
import { Tab4Table } from "@/components/dashboard/Tab4Table";
import { Tab6Table } from "@/components/dashboard/Tab6Table";
import { MonthlyCards } from "@/components/dashboard/MonthlyCards";
import { TratamentoMonthlyCards } from "@/components/dashboard/TratamentoMonthlyCards";
import { Tab3MonthlyCards } from "@/components/dashboard/Tab3MonthlyCards";
import { Tab4MonthlyCards } from "@/components/dashboard/Tab4MonthlyCards";
import { QuadrimesterCards } from "@/components/dashboard/QuadrimesterCards";
import { TratamentoQuadrimesterCards } from "@/components/dashboard/TratamentoQuadrimesterCards";
import { Tab3QuadrimesterCards } from "@/components/dashboard/Tab3QuadrimesterCards";
import { Tab4QuadrimesterCards } from "@/components/dashboard/Tab4QuadrimesterCards";
import { Tab3Table } from "@/components/dashboard/Tab3Table";
import { PatientFilters, FilterState } from "@/components/dashboard/PatientFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
const Index = () => {
  const [activeTab, setActiveTab] = useState("consulta");

  // Tab 1 - 1ª Consulta
  const {
    data: patients,
    isLoading: isLoadingPatients,
    error: errorPatients,
    refetch: refetchPatients,
    isFetching: isFetchingPatients
  } = usePatientData();

  // Tab 2 - Tratamento Concluído
  const {
    data: tratamentoPatients,
    isLoading: isLoadingTratamento,
    error: errorTratamento,
    refetch: refetchTratamento,
    isFetching: isFetchingTratamento
  } = useTratamentoData();

  // Tab 3 - Placeholder
  const {
    data: tab3Patients,
    isLoading: isLoadingTab3,
    error: errorTab3,
    refetch: refetchTab3,
    isFetching: isFetchingTab3
  } = useTab3Data();

  // Tab 4 - Placeholder
  const {
    data: tab4Patients,
    isLoading: isLoadingTab4,
    error: errorTab4,
    refetch: refetchTab4,
    isFetching: isFetchingTab4
  } = useTab4Data();

  // Tab 5 - Placeholder
  const {
    data: tab5Patients,
    isLoading: isLoadingTab5,
    error: errorTab5,
    refetch: refetchTab5,
    isFetching: isFetchingTab5
  } = useTab5Data();

  // Tab 6 - Placeholder
  const {
    data: tab6Patients,
    isLoading: isLoadingTab6,
    error: errorTab6,
    refetch: refetchTab6,
    isFetching: isFetchingTab6
  } = useTab6Data();

  // Filters
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
  const [filtersTab3, setFiltersTab3] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });
  const [filtersTab4, setFiltersTab4] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });
  const [filtersTab5, setFiltersTab5] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });
  const [filtersTab6, setFiltersTab6] = useState<FilterState>({
    equipe: "all",
    microarea: "all",
    status: "all"
  });

  // Filtered data
  const filteredPatients = useFilteredPatients(patients || [], filtersConsulta);
  const filteredTratamento = useFilteredTratamento(tratamentoPatients || [], filtersTratamento);
  const filteredTab3 = useFilteredTab3(tab3Patients || [], filtersTab3);
  const filteredTab4 = useFilteredTab4(tab4Patients || [], filtersTab4);
  const filteredTab5 = useFilteredTab5(tab5Patients || [], filtersTab5);
  const filteredTab6 = useFilteredTab6(tab6Patients || [], filtersTab6);

  // Get current tab's loading/error/refetch states
  const getTabState = () => {
    switch (activeTab) {
      case "consulta":
        return {
          isLoading: isLoadingPatients,
          error: errorPatients,
          isFetching: isFetchingPatients,
          refetch: refetchPatients
        };
      case "tratamento":
        return {
          isLoading: isLoadingTratamento,
          error: errorTratamento,
          isFetching: isFetchingTratamento,
          refetch: refetchTratamento
        };
      case "tab3":
        return {
          isLoading: isLoadingTab3,
          error: errorTab3,
          isFetching: isFetchingTab3,
          refetch: refetchTab3
        };
      case "tab4":
        return {
          isLoading: isLoadingTab4,
          error: errorTab4,
          isFetching: isFetchingTab4,
          refetch: refetchTab4
        };
      case "tab5":
        return {
          isLoading: isLoadingTab5,
          error: errorTab5,
          isFetching: isFetchingTab5,
          refetch: refetchTab5
        };
      case "tab6":
        return {
          isLoading: isLoadingTab6,
          error: errorTab6,
          isFetching: isFetchingTab6,
          refetch: refetchTab6
        };
      default:
        return {
          isLoading: false,
          error: null,
          isFetching: false,
          refetch: () => {}
        };
    }
  };
  const {
    error,
    isFetching,
    refetch
  } = getTabState();
  const refetchAll = () => {
    refetchPatients();
    refetchTratamento();
    refetchTab3();
    refetchTab4();
    refetchTab5();
    refetchTab6();
  };
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

  // Stats calculations
  const totalPatients = filteredPatients.length;
  const withConsultation = filteredPatients.filter(p => !isConsultaPendente(p.primeiraConsulta)).length;
  const totalTratamento = filteredTratamento.length;
  const withTratamento = filteredTratamento.filter(p => !isTratamentoPendente(p.tratamentoConcluido)).length;
  const totalTab3 = filteredTab3.length;
  const withExodontia = filteredTab3.filter(p => !isExodontiaPendente(p.numeradorB3)).length;
  const totalTab4 = filteredTab4.length;
  const withConsultaTab4 = filteredTab4.filter(p => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
  const totalTab5 = filteredTab5.length;
  const withConsultaTab5 = filteredTab5.filter(p => !isConsultaPendenteTab5(p.primeiraConsulta)).length;
  const totalTab6 = filteredTab6.length;
  const withConsultaTab6 = filteredTab6.filter(p => !isConsultaPendenteTab6(p.primeiraConsulta)).length;
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-[14px] py-[20px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl ml-0 mt-0 mr-0">
                Indicadores de Saúde Bucal de Varjota
              </h1>
              <p className="mt-1 text-muted-foreground">
                Painel de Monitoramento da Saúde Bucal
              </p>
            </div>
            <Button variant="outline" onClick={refetchAll} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar dados
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 rounded-none py-[26px]">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="flex w-full max-w-5xl flex-wrap gap-1 h-auto p-1 mx-auto justify-center">
            <TabsTrigger value="consulta" className="text-xs px-2 py-1.5 flex-1 min-w-fit">1ª Consulta Odontológica</TabsTrigger>
            <TabsTrigger value="tratamento" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Tratamento Concluído</TabsTrigger>
            <TabsTrigger value="tab3" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Taxa Exodontias</TabsTrigger>
            <TabsTrigger value="tab4" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Escovação Supervisionada</TabsTrigger>
            <TabsTrigger value="tab5" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Proced. Odont. Preventivos</TabsTrigger>
            <TabsTrigger value="tab6" className="text-xs px-2 py-1.5 flex-1 min-w-fit">Trat. Restaurador Atraumático</TabsTrigger>
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
                    { key: "num", header: "Nº" },
                    { key: "equipe", header: "Equipe" },
                    { key: "microarea", header: "Microárea" },
                    { key: "nome", header: "Nome" },
                    { key: "cpfCns", header: "CPF/CNS" },
                    { key: "idade", header: "Idade" },
                    { key: "sexo", header: "Sexo" },
                    { key: "primeiraConsulta", header: "1ª Consulta" },
                    { key: "status", header: "Status" },
                  ]}
                  pdfData={filteredPatients.map((p, i) => ({
                    num: i + 1,
                    equipe: p.equipe || "-",
                    microarea: p.microarea,
                    nome: p.nome,
                    cpfCns: p.cpfCns || "-",
                    idade: `${p.idade} anos`,
                    sexo: p.sexo === "Feminino" ? "F" : "M",
                    primeiraConsulta: p.primeiraConsulta === "-" ? "Sem registro" : p.primeiraConsulta,
                    status: isConsultaPendente(p.primeiraConsulta) ? "Pendente" : "Concluído",
                  }))}
                />
              </div>}

            <div id="dashboard-content-consulta">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingPatients ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalPatients.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com 1ª Consulta" value={withConsultation.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <QuadrimesterCards patients={filteredPatients} />
                  </>}
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Consultas por Mês (Últimos 12 meses)
                </h2>
                {isLoadingPatients ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <MonthlyCards patients={filteredPatients} />}
              </div>

              {isLoadingPatients ? <Skeleton className="h-96 rounded-xl" /> : <PatientTable patients={filteredPatients} />}
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
                    { key: "num", header: "Nº" },
                    { key: "equipe", header: "Equipe" },
                    { key: "microarea", header: "Microárea" },
                    { key: "nome", header: "Nome" },
                    { key: "cpfCns", header: "CPF/CNS" },
                    { key: "idade", header: "Idade" },
                    { key: "sexo", header: "Sexo" },
                    { key: "primeiraConsulta", header: "1ª Consulta" },
                    { key: "tratamentoConcluido", header: "Tratamento Concluído" },
                    { key: "status", header: "Status" },
                  ]}
                  pdfData={filteredTratamento.map((p, i) => ({
                    num: i + 1,
                    equipe: p.equipe || "-",
                    microarea: p.microarea,
                    nome: p.nome,
                    cpfCns: p.cpfCns || "-",
                    idade: `${p.idade} anos`,
                    sexo: p.sexo === "Masculino" ? "M" : "F",
                    primeiraConsulta: p.primeiraConsulta,
                    tratamentoConcluido: p.tratamentoConcluido,
                    status: isTratamentoPendente(p.tratamentoConcluido) ? "Pendente" : "Concluído",
                  }))}
                />
              </div>}

            <div id="dashboard-content-tratamento">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTratamento ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalTratamento.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com Tratamento" value={withTratamento.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <TratamentoQuadrimesterCards patients={filteredTratamento} />
                  </>}
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Tratamentos Odontológicos Concluídos por Mês (Últimos 12 meses)
                </h2>
                {isLoadingTratamento ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <TratamentoMonthlyCards patients={filteredTratamento} />}
              </div>

              {isLoadingTratamento ? <Skeleton className="h-96 rounded-xl" /> : <TratamentoTable patients={filteredTratamento} />}
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
                    { label: "Total de Atendimentos", value: totalTab3.toLocaleString("pt-BR") },
                    { label: "Com Exodontia", value: withExodontia.toLocaleString("pt-BR"), percentage: `${totalTab3 > 0 ? ((withExodontia / totalTab3) * 100).toFixed(1) : 0}%` },
                  ]}
                  pdfColumns={[
                    { key: "num", header: "Nº" },
                    { key: "equipe", header: "Equipe" },
                    { key: "microarea", header: "Microárea" },
                    { key: "nome", header: "Nome" },
                    { key: "dataNascimento", header: "DN" },
                    { key: "cpfCns", header: "CPF/CNS" },
                    { key: "idade", header: "Idade" },
                    { key: "sexo", header: "Sexo" },
                    { key: "numeradorB3", header: "Numerador B3" },
                    { key: "dataAtendimento", header: "Data Atendimento" },
                  ]}
                  pdfData={filteredTab3.map((p, i) => ({
                    num: i + 1,
                    equipe: p.equipe || "-",
                    microarea: p.microarea,
                    nome: p.nome,
                    dataNascimento: p.dataNascimento || "-",
                    cpfCns: p.cpfCns || "-",
                    idade: `${p.idade} anos`,
                    sexo: p.sexo === "Feminino" ? "F" : "M",
                    numeradorB3: p.numeradorB3,
                    dataAtendimento: p.dataAtendimento || "-",
                  }))}
                />
              </div>}

            <div id="dashboard-content-tab3">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTab3 ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Atendimentos" value={totalTab3.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com Exodontia" value={withExodontia.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <Tab3QuadrimesterCards patients={filteredTab3} />
                  </>}
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Exodontias por Mês (Últimos 12 meses)</h2>
                {isLoadingTab3 ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <Tab3MonthlyCards patients={filteredTab3} />}
              </div>

              {isLoadingTab3 ? <Skeleton className="h-96 rounded-xl" /> : <Tab3Table patients={filteredTab3} />}
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
                    { key: "num", header: "Nº" },
                    { key: "equipe", header: "Equipe" },
                    { key: "microarea", header: "Microárea" },
                    { key: "nome", header: "Nome" },
                    { key: "cpfCns", header: "CPF/CNS" },
                    { key: "idade", header: "Idade" },
                    { key: "sexo", header: "Sexo" },
                    { key: "primeiraConsulta", header: "Escovação Supervisionada" },
                    { key: "status", header: "Status" },
                  ]}
                  pdfData={filteredTab4.map((p, i) => ({
                    num: i + 1,
                    equipe: p.equipe || "-",
                    microarea: p.microarea,
                    nome: p.nome,
                    cpfCns: p.cpfCns || "-",
                    idade: `${p.idade} anos`,
                    sexo: p.sexo === "Feminino" ? "F" : "M",
                    primeiraConsulta: p.primeiraConsulta === "-" ? "Sem registro" : p.primeiraConsulta,
                    status: isConsultaPendenteTab4(p.primeiraConsulta) ? "Pendente" : "Concluído",
                  }))}
                />
              </div>}

            <div id="dashboard-content-tab4">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTab4 ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalTab4.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com 1ª Consulta" value={withConsultaTab4.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <Tab4QuadrimesterCards patients={filteredTab4} />
                  </>}
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Consultas por Mês (Últimos 12 meses)
                </h2>
                {isLoadingTab4 ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <Tab4MonthlyCards patients={filteredTab4} />}
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
                    { label: "Total de Pacientes", value: totalTab5.toLocaleString("pt-BR") },
                    { label: "Com Procedimento", value: withConsultaTab5.toLocaleString("pt-BR"), percentage: `${totalTab5 > 0 ? ((withConsultaTab5 / totalTab5) * 100).toFixed(1) : 0}%` },
                  ]}
                  pdfColumns={[
                    { key: "num", header: "Nº" },
                    { key: "equipe", header: "Equipe" },
                    { key: "microarea", header: "Microárea" },
                    { key: "nome", header: "Nome" },
                    { key: "cpfCns", header: "CPF/CNS" },
                    { key: "idade", header: "Idade" },
                    { key: "sexo", header: "Sexo" },
                    { key: "primeiraConsulta", header: "Procedimento" },
                    { key: "status", header: "Status" },
                  ]}
                  pdfData={filteredTab5.map((p, i) => ({
                    num: i + 1,
                    equipe: p.equipe || "-",
                    microarea: p.microarea,
                    nome: p.nome,
                    cpfCns: p.cpfCns || "-",
                    idade: `${p.idade} anos`,
                    sexo: p.sexo === "Feminino" ? "F" : "M",
                    primeiraConsulta: p.primeiraConsulta === "-" ? "Sem registro" : p.primeiraConsulta,
                    status: isConsultaPendenteTab5(p.primeiraConsulta) ? "Pendente" : "Concluído",
                  }))}
                />
              </div>}

            <div id="dashboard-content-tab5">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTab5 ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalTab5.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com 1ª Consulta" value={withConsultaTab5.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <QuadrimesterCards patients={filteredTab5 as any} />
                  </>}
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Consultas por Mês (Últimos 12 meses)
                </h2>
                {isLoadingTab5 ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <MonthlyCards patients={filteredTab5 as any} />}
              </div>

              {isLoadingTab5 ? <Skeleton className="h-96 rounded-xl" /> : <PatientTable patients={filteredTab5 as any} />}
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
                    { label: "Total de Pacientes", value: totalTab6.toLocaleString("pt-BR") },
                    { label: "Com Tratamento", value: withConsultaTab6.toLocaleString("pt-BR"), percentage: `${totalTab6 > 0 ? ((withConsultaTab6 / totalTab6) * 100).toFixed(1) : 0}%` },
                  ]}
                  pdfColumns={[
                    { key: "num", header: "Nº" },
                    { key: "equipe", header: "Equipe" },
                    { key: "microarea", header: "Microárea" },
                    { key: "nome", header: "Nome" },
                    { key: "cpfCns", header: "CPF/CNS" },
                    { key: "idade", header: "Idade" },
                    { key: "sexo", header: "Sexo" },
                    { key: "primeiraConsulta", header: "Tratamento" },
                    { key: "status", header: "Status" },
                  ]}
                  pdfData={filteredTab6.map((p, i) => ({
                    num: i + 1,
                    equipe: p.equipe || "-",
                    microarea: p.microarea,
                    nome: p.nome,
                    cpfCns: p.cpfCns || "-",
                    idade: `${p.idade} anos`,
                    sexo: p.sexo === "Feminino" ? "F" : "M",
                    primeiraConsulta: p.primeiraConsulta === "-" ? "Sem registro" : p.primeiraConsulta,
                    status: isConsultaPendenteTab6(p.primeiraConsulta) ? "Pendente" : "Concluído",
                  }))}
                />
              </div>}

            <div id="dashboard-content-tab6">
              <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
                {isLoadingTab6 ? <>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </> : <>
                    <StatsCard title="Total de Pacientes" value={totalTab6.toLocaleString("pt-BR")} icon={Users} variant="primary" />
                    <StatsCard title="Com 1ª Consulta" value={withConsultaTab6.toLocaleString("pt-BR")} icon={UserCheck} variant="success" />
                    <QuadrimesterCards patients={filteredTab6 as any} />
                  </>}
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  Consultas por Mês (Últimos 12 meses)
                </h2>
                {isLoadingTab6 ? <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
                    {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div> : <MonthlyCards patients={filteredTab6 as any} />}
              </div>

              {isLoadingTab6 ? <Skeleton className="h-96 rounded-xl" /> : <Tab6Table patients={filteredTab6} />}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Secretaria Municipal de Saúde de Varjota - 2026 • Desenvolvido por Alidemberg Araújo - Coordenador do e-SUS Municipal</p>
        </div>
      </footer>
    </div>;
};
export default Index;