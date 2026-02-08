import { useMemo } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Patient } from "@/hooks/usePatientData";
import { PDFGenerator } from "./PDFGenerator";

export interface FilterState {
  equipe: string;
  microarea: string;
  status: string;
}

interface PDFSummaryCard {
  label: string;
  value: string;
  percentage?: string;
}

interface PDFColumn {
  key: string;
  header: string;
}

interface PatientFiltersProps {
  patients: Patient[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  contentId?: string;
  // PDF configuration
  pdfTitle?: string;
  pdfSummaryCards?: PDFSummaryCard[];
  pdfColumns?: PDFColumn[];
  pdfData?: Record<string, any>[];
  pdfFileName?: string;
}

export const PatientFilters = ({
  patients,
  filters,
  onFiltersChange,
  contentId = "dashboard-content",
  pdfTitle = "Relatório",
  pdfSummaryCards = [],
  pdfColumns = [],
  pdfData = [],
  pdfFileName = "relatorio"
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

  // Build filter info string
  const filterInfo = useMemo(() => {
    const parts = [];
    if (filters.equipe !== "all") parts.push(`equipe: ${filters.equipe}`);
    if (filters.microarea !== "all") parts.push(`microárea: ${filters.microarea}`);
    if (filters.status !== "all") parts.push(`status: ${filters.status}`);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [filters]);

  return (
    <div className="flex-wrap p-4 bg-card border-2 my-0 px-[16px] py-[16px] gap-[25px] shadow-xl rounded-xl mx-0 flex-row flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
      </div>
      
      <Select value={filters.equipe} onValueChange={value => onFiltersChange({ ...filters, equipe: value })}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Equipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Equipes</SelectItem>
          {uniqueEquipes.map(equipe => (
            <SelectItem key={equipe} value={equipe}>{equipe}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.microarea} onValueChange={value => onFiltersChange({ ...filters, microarea: value })}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Microárea" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Microáreas</SelectItem>
          {uniqueMicroareas.map(microarea => (
            <SelectItem key={microarea} value={microarea}>Área {microarea}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={value => onFiltersChange({ ...filters, status: value })}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Status</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="concluido">Concluído</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          Limpar filtros
        </Button>
      )}

      <div className="ml-auto">
        <PDFGenerator
          title={pdfTitle}
          filterInfo={filterInfo}
          summaryCards={pdfSummaryCards}
          columns={pdfColumns}
          data={pdfData}
          fileName={pdfFileName}
        />
      </div>
    </div>
  );
};