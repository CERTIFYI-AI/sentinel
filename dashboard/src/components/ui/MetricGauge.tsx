import React from 'react';
import { Card, CardContent } from './card';

export interface MetricGaugeProps {
  metric: string;
  value: string | number;
  threshold?: number;
  unit?: string;
  trend?: number[]; // array of numbers representing 30-day trend sparkline
  className?: string;
}

export function MetricGauge({
  metric,
  value,
  threshold,
  unit = '',
  trend = [],
  className = '',
}: MetricGaugeProps) {
  // Simple SVG sparkline generator
  const renderSparkline = (data: number[]) => {
    if (data.length < 2) return null;
    const width = 80;
    const height = 24;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data
      .map((val, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="hsl(var(--brand))"
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  const isNumeric = typeof value === 'number';
  const displayValue = isNumeric ? (value as number) : parseFloat(value as string);
  const isOverThreshold = threshold !== undefined && !isNaN(displayValue) && displayValue > threshold;

  return (
    <Card className={`rounded-none border border-border bg-surface ${className}`}>
      <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            {metric}
          </span>
          {trend && trend.length > 0 && renderSparkline(trend)}
        </div>
        
        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-2xl font-bold font-sans ${isOverThreshold ? 'text-red-500' : 'text-text-primary'}`}>
            {value}
          </span>
          {unit && (
            <span className="text-[10px] text-text-secondary uppercase font-semibold">
              {unit}
            </span>
          )}
        </div>

        {threshold !== undefined && (
          <div className="flex justify-between items-center text-[10px] text-text-secondary border-t border-border/50 pt-1.5 mt-1">
            <span>LIMIT / THRESHOLD</span>
            <span className="font-mono font-bold">{threshold} {unit}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MetricGauge;
