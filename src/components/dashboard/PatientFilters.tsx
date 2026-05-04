import { useMemo } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Patient } from "@/hooks/usePatientData";
import { PDFGenerator } from "./PDFGenerator";
import { Quadrimestre, QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";
import { MesReferenciaMultiSelect } from "./MesReferenciaMultiSelect";
import { MultiSelect } from "./MultiSelect";

export interface FilterState {
  equipes: string[];          // [] = todas
  microareas: string[];       // [] = todas
  status: string;             // single
  quadrimestres: Quadrimestre[]; // [] = todos
  mesReferencia?: string[];
}

interface PDFSummaryCard { label: string; value: string; percentage?: string; }
interface PDFColumn { key: string; header: string; }
interface StatusOption { value: string; label: string; }

interface PatientFiltersProps {
  patients: Patient[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  contentId?: string;
  hideMicroarea?: boolean;
  hideStatus?: boolean;
  showMesReferencia?: boolean;
  mesReferenciaOptions?: string[];
  statusOptions?: StatusOption[];
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
  hideMicroarea = false,
  hideStatus = false,
  showMesReferencia = false,
  mesReferenciaOptions = [],
  statusOptions,
  pdfTitle = "Relatório",
  pdfSummaryCards = [],
  pdfColumns = [],
  pdfData = [],
  pdfFileName = "relatorio"
}: PatientFiltersProps) => {
  const uniqueEquipes = useMemo(() => {
    const equipes = [...new Set(patients.map(p => p.equipe).filter(e => e && e.trim() !== ""))];
    return equipes.sort();
  }, [patients]);

  const uniqueMicroareas = useMemo(() => {
    const microareas = [...new Set(patients.map(p => p.microarea).filter(m => m && m.trim() !== ""))];
    return microareas.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [patients]);

  const defaultStatusOptions: StatusOption[] = [
    { value: "pendente", label: "Pendente" },
    { value: "concluido", label: "Concluído" },
  ];
  const resolvedStatusOptions = statusOptions ?? defaultStatusOptions;

  const clearFilters = () => {
    onFiltersChange({ equipes: [], microareas: [], status: "all", quadrimestres: [], mesReferencia: [] });
  };

  const hasActiveFilters =
    filters.equipes.length > 0 ||
    filters.microareas.length > 0 ||
    filters.status !== "all" ||
    filters.quadrimestres.length > 0 ||
    (filters.mesReferencia && filters.mesReferencia.length > 0);

  const filterInfo = useMemo(() => {
    const parts: string[] = [];
    if (filters.equipes.length > 0) parts.push(`equipes: ${filters.equipes.join(", ")}`);
    if (filters.microareas.length > 0) parts.push(`microáreas: ${filters.microareas.join(", ")}`);
    if (filters.status !== "all") parts.push(`status: ${filters.status}`);
    if (filters.quadrimestres.length > 0) {
      const labels = filters.quadrimestres.map(q => QUADRIMESTRE_OPTIONS_SEM_TODOS.find(o => o.value === q)?.label ?? q);
      parts.push(`período: ${labels.join(", ")}`);
    }
    if (filters.mesReferencia && filters.mesReferencia.length > 0) parts.push(`mês ref.: ${filters.mesReferencia.join(", ")}`);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [filters]);

  return (
    <div className="w-full p-4 bg-card border-2 my-0 shadow-xl rounded-xl">
      <div className="flex items-center gap-3 w-full">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <MultiSelect
            value={filters.equipes}
            options={uniqueEquipes.map(e => ({ value: e, label: e }))}
            onChange={value => onFiltersChange({ ...filters, equipes: value })}
            placeholderAll="Todas Equipes"
            width="w-[220px]"
          />

          {!hideMicroarea && (
            <MultiSelect
              value={filters.microareas}
              options={uniqueMicroareas.map(m => ({ value: m, label: `Área ${m}` }))}
              onChange={value => onFiltersChange({ ...filters, microareas: value })}
              placeholderAll="Todas Microáreas"
              width="w-[170px]"
            />
          )}

          {!hideStatus && (
            <Select value={filters.status} onValueChange={value => onFiltersChange({ ...filters, status: value })}>
              <SelectTrigger className="w-[140px] h-9 shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {resolvedStatusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showMesReferencia && mesReferenciaOptions.length > 0 && (
            <MesReferenciaMultiSelect
              value={filters.mesReferencia || []}
              options={mesReferenciaOptions}
              onChange={value => onFiltersChange({ ...filters, mesReferencia: value })}
            />
          )}

          <MultiSelect
            value={filters.quadrimestres as string[]}
            options={QUADRIMESTRE_OPTIONS_SEM_TODOS.map(o => ({ value: o.value, label: o.label }))}
            onChange={value => onFiltersChange({ ...filters, quadrimestres: value as Quadrimestre[] })}
            placeholderAll="Todos os períodos"
            width="w-[230px]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 whitespace-normal text-center leading-tight h-auto max-w-[48px] text-xs px-1">
              Limpar filtros
            </Button>
          )}
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
    </div>
  );
};
