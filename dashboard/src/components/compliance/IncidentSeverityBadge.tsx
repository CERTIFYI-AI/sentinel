import { Badge } from "../ui/badge";

interface IncidentSeverityBadgeProps {
  severity: "critical" | "high" | "medium" | "low" | "info";
}

const variants: Record<string, "default" | "secondary" | "destructive"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
  info: "secondary",
};

export function IncidentSeverityBadge({ severity }: IncidentSeverityBadgeProps) {
  return <Badge variant={variants[severity]}>{severity.toUpperCase()}</Badge>;
}
