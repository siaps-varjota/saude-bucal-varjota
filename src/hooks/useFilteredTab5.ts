import { useMemo } from "react";
import { Tab5Record } from "./useTab5Data";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterByQuadrimestre } from "./useQuadrimesterFilter";

export const useFilteredTab5 = (records: Tab5Record[], filters: FilterState): Tab5Record[] => {
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
