import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface PolicyVersion {
  version: string;
  content: string;
  updatedAt: string;
  author: string;
}

interface PolicyVersionDiffProps {
  current: PolicyVersion;
  previous?: PolicyVersion;
}

export function PolicyVersionDiff({ current, previous }: PolicyVersionDiffProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Policy Version Diff</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>v{current.version} by {current.author}</span>
            <span>{current.updatedAt}</span>
          </div>
          {previous ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded bg-destructive/10 border text-sm">
                <p className="text-xs font-semibold text-destructive mb-1">Previous (v{previous.version})</p>
                <pre className="whitespace-pre-wrap text-xs">{previous.content}</pre>
              </div>
              <div className="p-3 rounded bg-[#1A6B5A]/10 border text-sm">
                <p className="text-xs font-semibold text-[#1A6B5A] mb-1">Current (v{current.version})</p>
                <pre className="whitespace-pre-wrap text-xs">{current.content}</pre>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded border text-sm">
              <pre className="whitespace-pre-wrap text-xs">{current.content}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
