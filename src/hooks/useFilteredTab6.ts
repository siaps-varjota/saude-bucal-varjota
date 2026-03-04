import { useMemo } from "react";
import { Tab6Record } from "./useTab6Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const useFilteredTab6 = (records: Tab6Record[], filters: FilterState): Tab6Record[] => {
  return useMemo(() => {
    return records.filter((record) => {
      if (filters.equipe !== "all" && record.equipe !== filters.equipe) {
        return false;
      }
      return true;
    });
  }, [records, filters]);
};
