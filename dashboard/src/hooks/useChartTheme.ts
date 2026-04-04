import { useMemo } from 'react';
import { useTheme } from '../providers/ThemeProvider';

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return useMemo(() => ({
    grid: isDark ? 'hsl(224 15% 18%)' : 'hsl(240 6% 90%)',
    axis: isDark ? 'hsl(215 15% 55%)' : 'hsl(240 4% 46%)',
    tooltipBg: isDark ? 'hsl(224 15% 14%)' : 'hsl(0 0% 100%)',
    tooltipBorder: isDark ? 'hsl(224 15% 24%)' : 'hsl(240 6% 90%)',
    tooltipText: isDark ? 'hsl(210 40% 96%)' : 'hsl(240 10% 4%)',
    brand: isDark ? 'hsl(142 47% 50%)' : 'hsl(142 47% 38%)',
    brandSubtle: isDark ? 'hsl(142 20% 14%)' : 'hsl(142 47% 96%)',
    ok: isDark ? 'hsl(142 60% 65%)' : 'hsl(142 69% 28%)',
    warn: isDark ? 'hsl(38 80% 65%)' : 'hsl(32 90% 33%)',
    error: isDark ? 'hsl(0 60% 65%)' : 'hsl(0 72% 35%)',
    info: isDark ? 'hsl(214 60% 65%)' : 'hsl(213 60% 33%)',
    series: isDark
      ? ['hsl(142 47% 50%)', 'hsl(214 60% 65%)', 'hsl(38 80% 65%)', 'hsl(0 60% 65%)', 'hsl(280 60% 65%)', 'hsl(190 60% 65%)']
      : ['hsl(142 47% 38%)', 'hsl(213 60% 33%)', 'hsl(32 90% 33%)', 'hsl(0 72% 35%)', 'hsl(280 60% 35%)', 'hsl(190 60% 35%)'],
  }), [isDark]);
}
