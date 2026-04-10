import { useState, useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parse, isValid } from "date-fns";

interface TratamentoTableProps {
  patients: TratamentoPatient[];
}

type SortField = "id" | "nome" | "equipe" | "microarea" | "idade" | "primeiraConsulta" | "tratamentoConcluido";
type SortDirection = "asc" | "desc";

const parseDateToTimestamp = (val: string): number => {
  if (!val || val === "-" || val.trim() === "") return 0;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed.getTime();
    } catch { continue; }
  }
  return 0;
};

export const TratamentoTable = ({ patients }: TratamentoTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 h-4 w-4 text-primary" />
      : <ArrowDown className="ml-1 h-4 w-4 text-primary" />;
  };

  const filteredAndSortedPatients = useMemo(() => {
    const result = patients.filter((patient) =>
      patient.nome.toLowerCase().includes(search.toLowerCase()) ||
      patient.cpfCns.includes(search) ||
      patient.equipe.toLowerCase().includes(search.toLowerCase()) ||
      patient.microarea.includes(search)
    );

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "id":        comparison = a.id - b.id; break;
        case "nome":      comparison = a.nome.localeCompare(b.nome); break;
        case "equipe":    comparison = a.equipe.localeCompare(b.equipe); break;
        case "microarea": comparison = a.microarea.localeCompare(b.microarea); break;
        case "idade":     comparison = a.idade - b.idade; break;
        // Ordena por timestamp real da data
        case "primeiraConsulta":
          comparison = parseDateToTimestamp(a.primeiraConsulta) - parseDateToTimestamp(b.primeiraConsulta);
          break;
        case "tratamentoConcluido":
          comparison = parseDateToTimestamp(a.tratamentoConcluido) - parseDateToTimestamp(b.tratamentoConcluido);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [patients, search, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedPatients.length / perPage);
  const paginatedPatients = filteredAndSortedPatients.slice((page - 1) * perPage, page * perPage);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            Lista de Pacientes - Tratamento Concluído ({filteredAndSortedPatients.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors w-16" onClick={() => handleSort("id")}>
                  <div className="flex items-center">Nº {getSortIcon("id")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("equipe")}>
                  <div className="flex items-center">Equipe {getSortIcon("equipe")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("microarea")}>
                  <div className="flex items-center">Microárea {getSortIcon("microarea")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("nome")}>
                  <div className="flex items-center">Nome {getSortIcon("nome")}</div>
                </TableHead>
                <TableHead className="font-semibold">CPF/CNS</TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("idade")}>
                  <div className="flex items-center">Idade {getSortIcon("idade")}</div>
                </TableHead>
                <TableHead className="font-semibold">Sexo</TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("primeiraConsulta")}>
                  <div className="flex items-center">1ª Consulta {getSortIcon("primeiraConsulta")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors whitespace-normal w-[110px]" onClick={() => handleSort("tratamentoConcluido")}>
                <div className="flex items-center">Tratamento<br />Concluído {getSortIcon("tratamentoConcluido")}</div>
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum paciente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPatients.map((patient, index) => (
                  <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{(page - 1) * perPage + index + 1}</TableCell>
                    <TableCell>{patient.equipe || "-"}</TableCell>
                    <TableCell>{patient.microarea}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{patient.nome}</TableCell>
                    <TableCell>{patient.cpfCns || "-"}</TableCell>
                    <TableCell>{patient.idade} anos</TableCell>
                    <TableCell>{patient.sexo === "Masculino" ? "M" : "F"}</TableCell>
                    <TableCell>{patient.primeiraConsulta}</TableCell>
                    <TableCell>{patient.tratamentoConcluido}</TableCell>
                    <TableCell>{patient.comTratamentoConcluido || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Exibindo</span>
            <Select value={perPage.toString()} onValueChange={(value) => { setPerPage(Number(value)); setPage(1); }}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>de {filteredAndSortedPatients.length} pacientes</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-4 text-sm">Página {page} de {totalPages || 1}</span>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => handlePageChange(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
