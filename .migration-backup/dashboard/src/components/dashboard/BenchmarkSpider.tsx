import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface BenchmarkCategory {
  label: string;
  score: number;
  benchmark: number;
}

interface BenchmarkSpiderProps {
  categories: BenchmarkCategory[];
}

export function BenchmarkSpider({ categories }: BenchmarkSpiderProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Benchmark Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{cat.label}</span>
                <span className="text-muted-foreground">{cat.score}% / {cat.benchmark}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden relative">
                <div className="h-full bg-muted-foreground/30 rounded-full absolute" style={{ width: cat.benchmark + "%" }} />
                <div className="h-full bg-[#1A6B5A] rounded-full absolute" style={{ width: cat.score + "%" }} />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#1A6B5A] rounded" /> Your score</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-muted-foreground/30 rounded" /> Industry avg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
