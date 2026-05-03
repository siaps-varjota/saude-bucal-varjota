import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  value: string[];
  options: MultiSelectOption[];
  onChange: (value: string[]) => void;
  placeholderAll: string; // e.g. "Todas Equipes"
  width?: string;         // e.g. "w-[220px]"
}

export const MultiSelect = ({
  value,
  options,
  onChange,
  placeholderAll,
  width = "w-[200px]",
}: MultiSelectProps) => {
  const allSelected = value.length === 0;

  const label = useMemo(() => {
    if (allSelected) return placeholderAll;
    if (value.length === 1) {
      const opt = options.find(o => o.value === value[0]);
      return opt?.label ?? value[0];
    }
    return `${value.length} selecionados`;
  }, [value, allSelected, options, placeholderAll]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };

  const selectAll = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`${width} h-9 justify-between font-normal shrink-0`}>
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${width} p-2 max-h-[300px] overflow-y-auto`} align="start">
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
          onClick={selectAll}
        >
          <Checkbox checked={allSelected} />
          <span className="text-sm">{placeholderAll}</span>
        </div>
        {options.map(opt => (
          <div
            key={opt.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
            onClick={() => toggle(opt.value)}
          >
            <Checkbox checked={value.includes(opt.value)} />
            <span className="text-sm">{opt.label}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
