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
import { useDenominadorB1 } from "@/hooks/useDenominadorB1"; // Importação do novo hook
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

  const { data: patients,          isLoading: isLoadingPatients,   error: errorPatients,   refetch: refetchPatients,   isFetching: isFetchingPatients   } = usePatientData();
  const { data: tratamentoPatients, isLoading: isLoadingTratamento, error: errorTratamento, refetch: refetchTratamento, isFetching: isFetchingTratamento } = useTratamentoData();
  const { data: tab3Patients,       isLoading: isLoadingTab3,       error: errorTab3,       refetch: refetchTab3,       isFetching: isFetchingTab3       } = useTab3Data();
  const { data: tab4Patients,       isLoading: isLoadingTab4,       error: errorTab4,       refetch: refetchTab4,       isFetching: isFetchingTab4       } = useTab4Data();
  const { data: tab5Patients,       isLoading: isLoadingTab5,       error: errorTab5,       refetch: refetchTab5,       isFetching: isFetchingTab5       } = useTab5Data();
  const { data: tab6Patients,       isLoading: isLoadingTab6,       error: errorTab6,       refetch: refetchTab6,       isFetching: isFetchingTab6       } = useTab6Data();

  // ── Denominador B1 vindo da planilha externa (react-query) ──────────────────
  const { data: denominadorB1Data, isLoading: isLoadingDenominadorB1 } = useDenominadorB1();

  const [filtersConsulta,   setFiltersConsulta]   = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTratamento, setFiltersTratamento] = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab3,       setFiltersTab3]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab4,       setFiltersTab4]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab5,       setFiltersTab5]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });
  const [filtersTab6,       setFiltersTab6]       = useState<FilterState>({ equipe: "all", microarea: "all", status: "all", quadrimestre: "todos" });

  const filteredPatients        = useFilteredPatients(patients || [], filtersConsulta);
  const filteredPatientsNoQuad  = useFilteredPatients(patients || [], { ...filtersConsulta, quadrimestre: "todos" });
  const filteredTratamento      = useFilteredTratamento(tratamentoPatients || [], filtersTratamento);
  const filteredTratamentoNoQuad = useFilteredTratamento(tratamentoPatients || [], { ...filtersTratamento, quadrimestre: "todos" });
  const filteredTab3            = useFilteredTab3(tab3Patients || [], filtersTab3);
  const filteredTab4            = useFilteredTab4(tab4Patients || [], filtersTab4);
  const filteredTab4NoQuad      = useFilteredTab4(tab4Patients || [], { ...filtersTab4, quadrimestre: "todos" });
  const filteredTab5            = useFilteredTab5(tab5Patients || [], filtersTab5);
  const filteredTab6            = useFilteredTab6(tab6Patients || [], filtersTab6);

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

  // Aguarda TODOS os dados — incluindo o CSV do denominador B1
  const isAllLoaded =
    !isLoadingPatients && !isLoadingTratamento && !isLoadingTab3 &&
    !isLoadingTab4 && !isLoadingTab5 && !isLoadingTab6 &&
    !isLoadingDenominadorB1;

  // Passa fallback seguro enquanto o CSV ainda não chegou
  const resultadoFinal = useResultadoFinal(
    patients           ?? [],
    tratamentoPatients ?? [],
    tab3Patients       ?? [],
    tab4Patients       ?? [],
    tab5Patients       ?? [],
    tab6Patients       ?? [],
    quadrimestre,
    equipeResultado,
    denominadorB1Data  ?? { porEquipe: new Map(), total: 0 }
  );

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

  // Restante do componente (renderização das abas e tabelas)...
  // (Omitido para brevidade, mas a lógica de integração está completa acima)
};

export default Index;
