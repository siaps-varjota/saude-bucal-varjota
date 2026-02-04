import { useState } from "react";
import { Tab3Patient } from "@/hooks/useTab3Data";
import { isExodontiaPendente } from "@/hooks/useFilteredTab3";
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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Tab3TableProps {
  patients: Tab3Patient[];
}

const ITEMS_PER_PAGE = 15;

export const Tab3Table = ({ patients }: Tab3TableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPatients = patients.filter((patient) =>
    patient.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cpfCns.includes(searchTerm) ||
    patient.equipe.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <Card className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Lista de Exodontias ({filteredPatients.length} pacientes)
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nº</TableHead>
                <TableHead className="font-semibold">Equipe</TableHead>
                <TableHead className="font-semibold">Microárea</TableHead>
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">DN</TableHead>
                <TableHead className="font-semibold">CPF/CNS</TableHead>
                <TableHead className="font-semibold">Idade</TableHead>
                <TableHead className="font-semibold">Sexo</TableHead>
                <TableHead className="font-semibold">Numerador B3</TableHead>
                <TableHead className="font-semibold">Data Atendimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.map((patient, index) => (
                <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{patient.equipe}</TableCell>
                  <TableCell>{patient.microarea}</TableCell>
                  <TableCell className="font-medium">{patient.nome}</TableCell>
                  <TableCell>{patient.dataNascimento}</TableCell>
                  <TableCell className="font-mono text-sm">{patient.cpfCns}</TableCell>
                  <TableCell>{patient.idade}</TableCell>
                  <TableCell>{patient.sexo}</TableCell>
                  <TableCell>
                    <Badge variant={isExodontiaPendente(patient.numeradorB3) ? "destructive" : "default"}>
                      {patient.numeradorB3}
                    </Badge>
                  </TableCell>
                  <TableCell>{patient.dataAtendimento}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredPatients.length)} de {filteredPatients.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
