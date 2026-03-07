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
import { Tab5Record } from "@/hooks/useTab5Data";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const getScoreColor = (percentage: number) => {
  if (percentage <= 30) return "bg-red-100 text-red-700 border-red-200";
  if (percentage <= 50) return "bg-amber-100 text-amber-700 border-amber-200";
  if (percentage <= 70) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

type SortKey = "equipe" | "preventivos" | "totalIndividuais" | "porcentagem" | "mesAno";
type SortDirection = "asc" | "desc" | null;

interface Tab5TableProps {
  records: Tab5Record[];
}

export const Tab5Table = ({ records }: Tab5TableProps) => {
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

  const filtered = records.filter((r) =>
    r.equipe.toLowerCase().includes(search.toLowerCase()) ||
    r.mesAno.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = useMemo(() => {
    if (!sortKey || !sortDirection) return filtered;
    return [...filtered].sort((a, b) => {
      if (sortKey === "preventivos" || sortKey === "totalIndividuais" || sortKey === "porcentagem") {
        const av = a[sortKey], bv = b[sortKey];
        return sortDirection === "asc" ? av - bv : bv - av;
      }
      const av = String(a[sortKey]).toLowerCase();
      const bv = String(b[sortKey]).toLowerCase();
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            Procedimentos Odontológicos Preventivos ({sorted.length} registros)
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar equipe ou mês..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Nº</TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("mesAno")}>
                  <div className="flex items-center">Mês/Ano {getSortIcon("mesAno")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("equipe")}>
                  <div className="flex items-center">Equipe {getSortIcon("equipe")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("preventivos")}>
                  <div className="flex items-center">Preventivos {getSortIcon("preventivos")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("totalIndividuais")}>
                  <div className="flex items-center">Total Individuais {getSortIcon("totalIndividuais")}</div>
                </TableHead>
                <TableHead className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors" onClick={() => handleSort("porcentagem")}>
                  <div className="flex items-center">Pontuação {getSortIcon("porcentagem")}</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r, index) => (
                 <TableRow key={`${r.mesAno}-${r.equipe}`} className="transition-colors hover:bg-muted/30">
                   <TableCell className="font-medium">{(page - 1) * perPage + index + 1}</TableCell>
                   <TableCell>{r.mesAno}</TableCell>
                   <TableCell>{r.equipe.replace(/^ESF/, "ESB")}</TableCell>
                  <TableCell>{r.preventivos}</TableCell>
                  <TableCell>{r.totalIndividuais}</TableCell>
                  <TableCell>
                    <Badge className={`${getScoreColor(r.porcentagem)} font-semibold`}>
                      {r.porcentagem.toFixed(2)}%
                    </Badge>
                  </TableCell>
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
            <span>de {sorted.length} registros</span>
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
