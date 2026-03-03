import { useMemo } from "react";
import { Tab3Record } from "./useTab3Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const useFilteredTab3 = (records: Tab3Record[], filters: FilterState): Tab3Record[] => {
  return useMemo(() => {
    return records.filter((record) => {
      if (filters.equipe !== "all" && record.equipe !== filters.equipe) {
        return false;
      }
      return true;
    });
  }, [records, filters]);
};
