import { useMemo } from "react";
import { Tab3Record } from "./useTab3Data";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterByQuadrimestre } from "./useQuadrimesterFilter";

export const useFilteredTab3 = (records: Tab3Record[], filters: FilterState): Tab3Record[] => {
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
