import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

interface MesReferenciaMultiSelectProps {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
}

export const MesReferenciaMultiSelect = ({ value, options, onChange }: MesReferenciaMultiSelectProps) => {
  const allSelected = value.length === 0;

  const label = useMemo(() => {
    if (allSelected) return "Todos os Meses";
    if (value.length === 1) return value[0];
    return `${value.length} meses selecionados`;
  }, [value, allSelected]);

  const toggleMonth = (month: string) => {
    if (value.includes(month)) {
      onChange(value.filter(v => v !== month));
    } else {
      onChange([...value, month]);
    }
  };

  const selectAll = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[220px] h-9 justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2 max-h-[300px] overflow-y-auto" align="start">
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
          onClick={selectAll}
        >
          <Checkbox checked={allSelected} />
          <span className="text-sm">Todos os Meses</span>
        </div>
        {options.map(mes => (
          <div
            key={mes}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
            onClick={() => toggleMonth(mes)}
          >
            <Checkbox checked={value.includes(mes)} />
            <span className="text-sm">{mes}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
