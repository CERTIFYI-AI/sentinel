import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ComplianceScore, Framework } from '@/lib/types/policy';

interface Props {
  scores: ComplianceScore[];
  loading?: boolean;
}

export function ComplianceDashboard({ scores, loading }: Props) {
  if (loading) return <div className='animate-pulse h-32 bg-muted rounded-none' />;
  const overall = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3'>
              <span className="h-8 w-8 text-[#1A6B5A]">🛡</span>
              <div>
                <p className='text-2xl font-bold'>{overall}%</p>
                <p className='text-xs text-muted-foreground'>Overall Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3'>
              <span className="h-8 w-8 text-emerald-600">📄</span>
              <div>
                <p className='text-2xl font-bold'>{scores.reduce((a, s) => a + s.total, 0)}</p>
                <p className='text-xs text-muted-foreground'>Total Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3'>
              <span className="h-8 w-8 text-green-500">✅</span>
              <div>
                <p className='text-2xl font-bold'>{scores.reduce((a, s) => a + s.compliant, 0)}</p>
                <p className='text-xs text-muted-foreground'>Compliant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center gap-3'>
              <span className="h-8 w-8 text-yellow-500">⚠</span>
              <div>
                <p className='text-2xl font-bold'>{scores.reduce((a, s) => a + s.gaps.length, 0)}</p>
                <p className='text-xs text-muted-foreground'>Gaps Found</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {scores.map(score => (
          <Card key={score.framework}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm flex items-center justify-between'>
                <span>{score.framework}</span>
                <Badge variant={score.score >= 80 ? 'default' : score.score >= 50 ? 'secondary' : 'destructive'}>{score.score}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={score.score} className='mb-2' />
              <div className='flex justify-between text-xs text-muted-foreground'>
                <span>{score.compliant}/{score.total} compliant</span>
                <span>{score.gaps.length} gaps</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
