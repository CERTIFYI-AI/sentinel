
import { useMemo } from 'react';
import { useTheme } from '../providers/theme';

export interface ChartTheme {
  grid: string;
  axis: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  brand: string;
  colors: string[];
}

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${val})`;
}

export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  return useMemo(() => {
    const brand = getCssVar('--brand');
    return {
      grid: getCssVar('--border'),
      axis: getCssVar('--text-4'),
      text: getCssVar('--text-4'),
      tooltipBg: getCssVar('--bg-surface'),
      tooltipBorder: getCssVar('--border-mid'),
      tooltipText: getCssVar('--text-1'),
      brand,
      colors: [
        brand,
        getCssVar('--s-ok-tx'),
        getCssVar('--s-wn-tx'),
        getCssVar('--s-er-tx'),
        'hsl(280 70% 55%)',
        'hsl(200 70% 55%)',
      ],
    };
  }, [resolved]);
}
