import { PageWrapper } from "../components/layout/PageWrapper";
import { BenchmarkSpider } from "../components/dashboard/BenchmarkSpider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const categories = [
  { label: "Transparency", score: 82, benchmark: 65 },
  { label: "Fairness", score: 71, benchmark: 70 },
  { label: "Safety", score: 90, benchmark: 75 },
  { label: "Privacy", score: 68, benchmark: 72 },
  { label: "Accountability", score: 85, benchmark: 60 },
  { label: "Robustness", score: 76, benchmark: 68 },
];

export default function Benchmark() {
  return (
    <PageWrapper title="Benchmark" description="Compare your AI governance posture against industry benchmarks">
      <div className="grid gap-4 md:grid-cols-2">
        <BenchmarkSpider categories={categories} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-primary">78</p>
              <p className="text-sm text-muted-foreground mt-2">out of 100</p>
              <p className="text-xs text-muted-foreground mt-1">Industry average: 68</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
