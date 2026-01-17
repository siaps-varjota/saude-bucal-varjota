import { useMemo } from "react";
import { Filter, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Patient } from "@/hooks/usePatientData";
import { toast } from "sonner";
export interface FilterState {
  equipe: string;
  microarea: string;
  status: string;
}
interface PatientFiltersProps {
  patients: Patient[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}
export const PatientFilters = ({
  patients,
  filters,
  onFiltersChange
}: PatientFiltersProps) => {
  // Get unique values for filters
  const uniqueEquipes = useMemo(() => {
    const equipes = [...new Set(patients.map(p => p.equipe).filter(e => e && e.trim() !== ""))];
    return equipes.sort();
  }, [patients]);
  const uniqueMicroareas = useMemo(() => {
    const microareas = [...new Set(patients.map(p => p.microarea).filter(m => m && m.trim() !== ""))];
    return microareas.sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [patients]);
  const clearFilters = () => {
    onFiltersChange({
      equipe: "all",
      microarea: "all",
      status: "all"
    });
  };
  const hasActiveFilters = filters.equipe !== "all" || filters.microarea !== "all" || filters.status !== "all";
  const handleGeneratePDF = async () => {
    toast.info("Gerando PDF...");
    const element = document.getElementById("dashboard-content");
    if (!element) {
      toast.error("Erro ao gerar PDF");
      return;
    }
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 10,
        filename: `dashboard-saude-bucal-${new Date().toISOString().split('T')[0]}.pdf`,
        image: {
          type: 'jpeg' as const,
          quality: 0.98
        },
        html2canvas: {
          scale: 2,
          useCORS: true
        },
        jsPDF: {
          unit: 'mm' as const,
          format: 'a4' as const,
          orientation: 'landscape' as const
        }
      };
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };
  return <div className="flex flex-wrap items-center p-4 bg-card rounded-lg shadow-sm gap-[12px] border-2 my-0 px-[16px] py-[16px]">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
      </div>
      
      <Select value={filters.equipe} onValueChange={value => onFiltersChange({
      ...filters,
      equipe: value
    })}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Equipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Equipes</SelectItem>
          {uniqueEquipes.map(equipe => <SelectItem key={equipe} value={equipe}>
              {equipe}
            </SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.microarea} onValueChange={value => onFiltersChange({
      ...filters,
      microarea: value
    })}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Microárea" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Microáreas</SelectItem>
          {uniqueMicroareas.map(microarea => <SelectItem key={microarea} value={microarea}>
              Área {microarea}
            </SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={value => onFiltersChange({
      ...filters,
      status: value
    })}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Status</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          Limpar filtros
        </Button>}

      <div className="ml-auto">
        <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="h-9 gap-2">
          <FileDown className="h-4 w-4" />
          Gerar PDF
        </Button>
      </div>
    </div>;
};