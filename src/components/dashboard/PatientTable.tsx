import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Patient } from "@/hooks/usePatientData";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { parse, isValid } from "date-fns";

type SortKey = "id" | "nome" | "equipe" | "microarea" | "idade" | "sexo" | "primeiraConsulta" | "comPrimeiraConsulta";
type SortDirection = "asc" | "desc" | null;

interface PatientTableProps {
  patients: Patient[];
}

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

export const PatientTable = ({ patients }: PatientTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortKey(null); setSortDirection(null); }
      else setSortDirection("asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1" />;
    return <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const filteredPatients = patients.filter((patient) =>
    patient.nome.toLowerCase().includes(search.toLowerCase()) ||
    patient.microarea.includes(search) ||
    patient.cpfCns.includes(search) ||
    patient.equipe.toLowerCase().includes(search.toLowerCase())
  );

  const sortedPatients = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredPatients;

    return [...filteredPatients].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "id" || sortKey === "idade") {
        comparison = (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0);
      } else if (sortKey === "primeiraConsulta") {
        // Ordena por timestamp real da data
        comparison = parseDateToTimestamp(a.primeiraConsulta) - parseDateToTimestamp(b.primeiraConsulta);
      } else {
        const aVal = String(a[sortKey] ?? "").toLowerCase();
        const bVal = String(b[sortKey] ?? "").toLowerCase();
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredPatients, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedPatients.length / perPage);
  const paginatedPatients = sortedPatients.slice((page - 1) * perPage, page * perPage);

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            Lista de Pacientes - 1ª Consulta Odontológica ({sortedPatients.length})
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
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("id")}>
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
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("sexo")}>
                  <div className="flex items-center">Sexo {getSortIcon("sexo")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("primeiraConsulta")}>
                  <div className="flex items-center">1ª Consulta {getSortIcon("primeiraConsulta")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("comPrimeiraConsulta")}>
                  <div className="flex items-center">Status {getSortIcon("comPrimeiraConsulta")}</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.map((patient, index) => (
                <TableRow key={patient.id} className="transition-colors hover:bg-muted/30">
                  <TableCell className="font-medium">{(page - 1) * perPage + index + 1}</TableCell>
                  <TableCell>{patient.equipe || "-"}</TableCell>
                  <TableCell>{patient.microarea}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{patient.nome}</TableCell>
                  <TableCell>{patient.cpfCns || "-"}</TableCell>
                  <TableCell>{patient.idade} anos</TableCell>
                  <TableCell>{patient.sexo === "Feminino" ? "F" : "M"}</TableCell>
                  <TableCell>{patient.primeiraConsulta === "-" ? "Sem registro" : patient.primeiraConsulta}</TableCell>
                  <TableCell>{isConsultaPendente(patient.primeiraConsulta) ? "Pendente" : "Concluído"}</TableCell>
                </TableRow>
              ))}
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
            <span>de {sortedPatients.length} pacientes</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-4 text-sm">Página {page} de {totalPages || 1}</span>
            <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
