const BASE = '/api';
export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers as any },
    ...opts,
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
  return r.json();
}
export const get = <T>(p: string) => api<T>(p);
export const post = <T>(p: string, body: any) => api<T>(p, { method: 'POST', body: JSON.stringify(body) });
export const put = <T>(p: string, body: any) => api<T>(p, { method: 'PUT', body: JSON.stringify(body) });
export const del = <T>(p: string) => api<T>(p, { method: 'DELETE' });
