import { useState } from "react";
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
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";

interface PatientTableProps {
  patients: Patient[];
}

export const PatientTable = ({ patients }: PatientTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filteredPatients = patients.filter(
    (patient) =>
      patient.nome.toLowerCase().includes(search.toLowerCase()) ||
      patient.microarea.includes(search) ||
      patient.cpfCns.includes(search)
  );

  const totalPages = Math.ceil(filteredPatients.length / perPage);
  const paginatedPatients = filteredPatients.slice(
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
                <TableHead className="font-semibold">Nº</TableHead>
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Microárea</TableHead>
                <TableHead className="font-semibold">Idade</TableHead>
                <TableHead className="font-semibold">Sexo</TableHead>
                <TableHead className="font-semibold">1ª Consulta</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
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
                        patient.comPrimeiraConsulta.includes("NÃO")
                          ? "destructive"
                          : "default"
                      }
                      className={
                        patient.comPrimeiraConsulta.includes("NÃO")
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-success/10 text-success hover:bg-success/20"
                      }
                    >
                      {patient.comPrimeiraConsulta.includes("NÃO")
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
