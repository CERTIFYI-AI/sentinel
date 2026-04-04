
import { useMemo } from 'react';
import { useTheme } from '../providers/theme';

export interface ChartTheme {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  brand: string;
}

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${val})`;
}

export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  return useMemo(() => ({
    grid: getCssVar('--border'),
    axis: getCssVar('--text-4'),
    tooltipBg: getCssVar('--bg-surface'),
    tooltipBorder: getCssVar('--border-mid'),
    tooltipText: getCssVar('--text-1'),
    brand: getCssVar('--brand'),
  }), [resolved]);
}
