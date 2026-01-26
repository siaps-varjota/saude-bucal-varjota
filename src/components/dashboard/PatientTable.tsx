import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Patient } from "@/hooks/usePatientData";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "id" | "nome" | "equipe" | "microarea" | "idade" | "sexo" | "primeiraConsulta" | "comPrimeiraConsulta";
type SortDirection = "asc" | "desc" | null;

interface PatientTableProps {
  patients: Patient[];
}

export const PatientTable = ({ patients }: PatientTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
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

  const filteredPatients = patients.filter((patient) => {
    return (
      patient.nome.toLowerCase().includes(search.toLowerCase()) ||
      patient.microarea.includes(search) ||
      patient.cpfCns.includes(search) ||
      patient.equipe.toLowerCase().includes(search.toLowerCase())
    );
  });

  const sortedPatients = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredPatients;

    return [...filteredPatients].sort((a, b) => {
      let aValue: string | number = a[sortKey];
      let bValue: string | number = b[sortKey];

      // Handle numeric sorting for id and idade
      if (sortKey === "id" || sortKey === "idade") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Handle string sorting
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPatients, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedPatients.length / perPage);
  const paginatedPatients = sortedPatients.slice(
    (page - 1) * perPage,
    page * perPage
  );

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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center">
                    Nº {getSortIcon("id")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("equipe")}
                >
                  <div className="flex items-center">
                    Equipe {getSortIcon("equipe")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("microarea")}
                >
                  <div className="flex items-center">
                    Microárea {getSortIcon("microarea")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("nome")}
                >
                  <div className="flex items-center">
                    Nome {getSortIcon("nome")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center">
                    CPF/CNS
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("idade")}
                >
                  <div className="flex items-center">
                    Idade {getSortIcon("idade")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("sexo")}
                >
                  <div className="flex items-center">
                    Sexo {getSortIcon("sexo")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("primeiraConsulta")}
                >
                  <div className="flex items-center">
                    1ª Consulta {getSortIcon("primeiraConsulta")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => handleSort("comPrimeiraConsulta")}
                >
                  <div className="flex items-center">
                    Status {getSortIcon("comPrimeiraConsulta")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.map((patient, index) => (
                <TableRow
                  key={patient.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell className="font-medium">
                    {(page - 1) * perPage + index + 1}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {patient.equipe || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      Área {patient.microarea}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {patient.nome}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.cpfCns || "-"}
                  </TableCell>
                  <TableCell>{patient.idade} anos</TableCell>
                  <TableCell>
                    <Badge
                      variant={patient.sexo === "Feminino" ? "default" : "secondary"}
                      className="font-normal"
                    >
                      {patient.sexo === "Feminino" ? "F" : "M"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {patient.primeiraConsulta === "-"
                      ? "Sem registro"
                      : patient.primeiraConsulta}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        isConsultaPendente(patient.primeiraConsulta)
                          ? "destructive"
                          : "default"
                      }
                      className={
                        isConsultaPendente(patient.primeiraConsulta)
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-success/10 text-success hover:bg-success/20"
                      }
                    >
                      {isConsultaPendente(patient.primeiraConsulta)
                        ? "Pendente"
                        : "Concluído"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Exibindo</span>
            <Select
              value={perPage.toString()}
              onValueChange={(value) => {
                setPerPage(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>
              de {sortedPatients.length} pacientes
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 text-sm">
              Página {page} de {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
