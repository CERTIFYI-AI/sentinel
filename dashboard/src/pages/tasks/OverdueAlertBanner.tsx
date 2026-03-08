import { useMemo } from "react";
export default function OverdueAlertBanner() {
  const overdueCount = useMemo(() => 3, []);
  if (overdueCount === 0) return null;
  return (<div className="bg-red-50 border border-red-200 rounded p-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-red-600 font-medium">{overdueCount} overdue tasks need attention</span></div><button className="text-sm text-red-600 hover:text-red-800 underline">View All</button></div>);}
