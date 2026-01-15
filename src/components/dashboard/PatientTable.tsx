import { useState, useMemo } from "react";
import { parse, isValid, differenceInYears } from "date-fns";
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
import { Patient } from "@/hooks/usePatientData";
import { Search, ChevronLeft, ChevronRight, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "id" | "nome" | "microarea" | "idade" | "sexo" | "primeiraConsulta" | "comPrimeiraConsulta";
type SortDirection = "asc" | "desc" | null;

const parseConsultaDate = (consulta: string): Date | null => {
  if (!consulta || consulta === "-" || consulta.trim() === "") return null;
  
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(consulta.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const isConsultaPendente = (primeiraConsulta: string): boolean => {
  if (!primeiraConsulta || primeiraConsulta === "-" || primeiraConsulta.trim() === "") {
    return true; // No consultation = pending
  }
  
  const consultaDate = parseConsultaDate(primeiraConsulta);
  if (!consultaDate) return true;
  
  const yearsAgo = differenceInYears(new Date(), consultaDate);
  return yearsAgo >= 1;
};

interface PatientTableProps {
  patients: Patient[];
}

export const PatientTable = ({ patients }: PatientTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const perPage = 10;

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

  const filteredPatients = patients.filter(
    (patient) =>
      patient.nome.toLowerCase().includes(search.toLowerCase()) ||
      patient.microarea.includes(search) ||
      patient.cpfCns.includes(search)
  );

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
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-card to-muted/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Pacientes Cadastrados
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filteredPatients.length} pacientes encontrados
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, microárea..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                  onClick={() => handleSort("nome")}
                >
                  <div className="flex items-center">
                    Nome {getSortIcon("nome")}
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
              {paginatedPatients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell className="font-medium">{patient.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {patient.nome}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      Área {patient.microarea}
                    </Badge>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
