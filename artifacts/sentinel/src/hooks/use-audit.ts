// @ts-nocheck
// dashboard/src/hooks/use-audit.ts

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchAuditLog } from "../api/client";

export function useAuditLog(page: number, pageSize = 25) {
  return useQuery({
    queryKey: ["audit", page, pageSize],
    queryFn: () => fetchAuditLog(page, pageSize),
    placeholderData: keepPreviousData,
  });
}