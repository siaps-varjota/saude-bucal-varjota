import { useMemo } from "react";
import { Tab5Record } from "./useTab5Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const useFilteredTab5 = (records: Tab5Record[], filters: FilterState): Tab5Record[] => {
  return useMemo(() => {
    return records.filter((record) => {
      if (filters.equipe !== "all" && record.equipe !== filters.equipe) {
        return false;
      }
      return true;
    });
  }, [records, filters]);
};
