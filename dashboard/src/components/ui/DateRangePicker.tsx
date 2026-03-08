import { useState } from "react";
import { DatePicker } from "./DatePicker";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (d: string) => void;
  onEndChange: (d: string) => void;
}

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker value={startDate} onChange={onStartChange} placeholder="Start date" />
      <span className="text-[hsl(var(--muted-foreground))] text-sm">to</span>
      <DatePicker value={endDate} onChange={onEndChange} placeholder="End date" />
    </div>
  );
}
