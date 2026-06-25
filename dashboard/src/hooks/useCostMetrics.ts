import { useState, useEffect, useMemo } from 'react';

// Base mock data seeds
const BASE_TOKEN_USAGE = [
  { day: 'Mon', tokens: 42.3 },
  { day: 'Tue', tokens: 48.1 },
  { day: 'Wed', tokens: 44.7 },
  { day: 'Thu', tokens: 51.2 },
  { day: 'Fri', tokens: 47.8 },
  { day: 'Sat', tokens: 38.2 },
  { day: 'Sun', tokens: 40.7 },
];

const BASE_COST_TREND = [
  { day: 'Mon', cost: 1.27 },
  { day: 'Tue', cost: 1.44 },
  { day: 'Wed', cost: 1.34 },
  { day: 'Thu', cost: 1.54 },
  { day: 'Fri', cost: 1.43 },
  { day: 'Sat', cost: 1.15 },
  { day: 'Sun', cost: 1.22 },
];

const BASE_COST_BY_MODEL = [
  { model: 'GPT-4o', cost: 3.82, prompt: 420, comp: 180, color: 'hsl(var(--s-in-tx))' },
  { model: 'Claude-3-Opus', cost: 2.14, prompt: 150, comp: 90, color: 'hsl(var(--s-ok-tx))' },
  { model: 'GPT-3.5-Turbo', cost: 1.21, prompt: 850, comp: 120, color: 'hsl(var(--s-wn-tx))' },
  { model: 'Claude-3-Haiku', cost: 0.89, prompt: 300, comp: 150, color: 'hsl(var(--s-wn-tx))' },
  { model: 'GPT-4o-Mini', cost: 0.74, prompt: 500, comp: 200, color: 'hsl(280 67% 56%)' },
  { model: 'Mistral-7B', cost: 0.59, prompt: 100, comp: 45, color: 'hsl(var(--destructive))' },
];

const BASE_TOKEN_BY_AGENT = [
  { agent: 'OpenAI-API-Connector', tokens: 78.2, pct: 25 },
  { agent: 'DataLabeler-v2', tokens: 63.1, pct: 20 },
  { agent: 'LoanAssistant', tokens: 45.3, pct: 14 },
  { agent: 'SupportBot', tokens: 31.2, pct: 10 },
  { agent: 'RiskAnalyzer', tokens: 20.4, pct: 7 },
];

const BASE_PROVIDER_TRAFFIC = [
  { provider: 'OpenAI', reqs: 14200, pct: 65, activeKeys: 3, latency: 420, status: 'Healthy' },
  { provider: 'Anthropic', reqs: 5800, pct: 28, activeKeys: 2, latency: 650, status: 'Healthy' },
  { provider: 'Local Llama', reqs: 1200, pct: 7, activeKeys: 1, latency: 120, status: 'Healthy' },
];

export function useCostMetrics(dateRange: string) {
  const [providerTraffic, setProviderTraffic] = useState(BASE_PROVIDER_TRAFFIC);

  // Simulate real-time traffic updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setProviderTraffic(prev => prev.map(p => {
        // Randomly fluctuate requests by +/- 2%
        const reqsDelta = Math.floor(p.reqs * (Math.random() * 0.04 - 0.02));
        // Randomly fluctuate latency by +/- 15ms
        const latDelta = Math.floor(Math.random() * 30 - 15);
        
        return {
          ...p,
          reqs: Math.max(0, p.reqs + reqsDelta),
          latency: Math.max(10, p.latency + latDelta),
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scale data based on date range
  const scaledData = useMemo(() => {
    let multiplier = 1;
    if (dateRange === 'today') multiplier = 0.15;
    if (dateRange === 'month') multiplier = 4.2;
    if (dateRange === 'custom') multiplier = 2.5;

    const tokenUsage = BASE_TOKEN_USAGE.map(d => ({ ...d, tokens: Number((d.tokens * multiplier).toFixed(1)) }));
    const costTrend = BASE_COST_TREND.map(d => ({ ...d, cost: Number((d.cost * multiplier).toFixed(2)) }));
    
    const costByModel = BASE_COST_BY_MODEL.map(d => ({ 
      ...d, 
      cost: Number((d.cost * multiplier).toFixed(2)),
      prompt: Math.round(d.prompt * multiplier),
      comp: Math.round(d.comp * multiplier)
    }));

    const tokenByAgent = BASE_TOKEN_BY_AGENT.map(d => ({
      ...d,
      tokens: Number((d.tokens * multiplier).toFixed(1))
    }));

    const totalTokens = tokenUsage.reduce((acc, curr) => acc + curr.tokens, 0);
    const totalCost = costTrend.reduce((acc, curr) => acc + curr.cost, 0);

    return { tokenUsage, costTrend, costByModel, tokenByAgent, totalTokens, totalCost };
  }, [dateRange]);

  return {
    ...scaledData,
    providerTraffic
  };
}
