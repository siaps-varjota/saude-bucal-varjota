import { useMemo } from "react";
import { Tab6Record } from "./useTab6Data";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterByQuadrimestre } from "./useQuadrimesterFilter";

export const useFilteredTab6 = (records: Tab6Record[], filters: FilterState): Tab6Record[] => {
  return useMemo(() => {
    let filtered = filterByQuadrimestre(records, filters.quadrimestre);
    return filtered.filter((record) => {
      if (filters.equipe !== "all" && record.equipe !== filters.equipe) {
        return false;
      }
      return true;
    });
  }, [records, filters]);
};
