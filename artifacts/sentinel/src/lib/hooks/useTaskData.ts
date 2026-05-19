// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../queryClient";
import { QK } from "../queryKeys";

/* ── Types ── */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  assignee: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface TaskStats {
  total: number;
  open: number;
  inProgress: number;
  done: number;
  blocked: number;
  overdue: number;
}

/* ── Hooks ── */
export function useTaskStats() {
  return useQuery({
    queryKey: QK.taskStats,
    queryFn: () =>
      api<TaskStats>("dashboard/tasks/stats"),
    refetchInterval: 30_000,
  });
}

export function useTasks(status?: string) {
  return useQuery({
    queryKey: [...QK.tasks, status ?? "ALL"],
    queryFn: () =>
      api<Task[]>(
        `dashboard/tasks${status ? `?status=${status}` : ""}`
      ),
    refetchInterval: 15_000,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; status: Task["status"]; assignee?: string }) =>
      api<Task>(`dashboard/tasks/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.tasks });
      queryClient.invalidateQueries({ queryKey: QK.taskStats });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Task, "id" | "createdAt" | "updatedAt">) =>
      api<Task>("dashboard/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.tasks });
      queryClient.invalidateQueries({ queryKey: QK.taskStats });
    },
  });
}
