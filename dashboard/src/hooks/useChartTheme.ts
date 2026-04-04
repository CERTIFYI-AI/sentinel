export function useChartTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    grid: isDark ? "hsl(224 15% 18%)" : "hsl(240 6% 90%)",
    axis: isDark ? "hsl(215 15% 55%)" : "hsl(240 4% 46%)",
    tooltip: {
      bg: isDark ? "hsl(224 15% 14%)" : "hsl(0 0% 100%)",
      border: isDark ? "hsl(224 15% 24%)" : "hsl(240 6% 90%)",
      color: isDark ? "hsl(210 40% 96%)" : "hsl(240 10% 4%)",
    },
    brand: "hsl(142 47% 38%)",
    error: "hsl(0 72% 51%)",
    warn: "hsl(38 92% 50%)",
    ok: "hsl(142 69% 36%)",
    info: "hsl(213 94% 50%)",
  };
}
export default useChartTheme;
