import { useTheme } from '../providers/ThemeProvider';

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  return {
    grid: resolvedTheme === 'dark' ? 'hsl(224 15% 18%)' : 'hsl(240 5.9% 92%)',
    axis: resolvedTheme === 'dark' ? 'hsl(215 15% 55%)' : 'hsl(240 3.8% 46%)',
    tooltip: {
      bg: resolvedTheme === 'dark' ? 'hsl(224 15% 14%)' : 'hsl(0 0% 100%)',
      border: resolvedTheme === 'dark' ? 'hsl(224 15% 24%)' : 'hsl(240 5.9% 90%)',
      text: resolvedTheme === 'dark' ? 'hsl(210 40% 96%)' : 'hsl(240 10% 3.9%)',
    },
    colors: {
      brand: '#368F4D',
      blue: '#3b82f6',
      amber: '#f59e0b',
      red: '#ef4444',
      purple: '#8b5cf6',
      cyan: '#06b6d4',
      orange: '#f97316',
      slate: resolvedTheme === 'dark' ? '#94a3b8' : '#64748b',
    },
  };
}
