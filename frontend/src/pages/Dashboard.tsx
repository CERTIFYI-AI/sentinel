import { useApi } from '../hooks';

export default function Dashboard() {
  const { data: health } = useApi<any>('/health/health');
  const { data: policies } = useApi<any[]>('/policies');
  const { data: models } = useApi<any[]>('/models');
  const { data: events } = useApi<any[]>('/events');
  const { data: tasks } = useApi<any[]>('/tasks');

  return (
    <div>
      <h1 className="page-title">Sentinel Dashboard</h1>
      <div className="grid">
        <div className="card stat">
          <div className="num">{health?.status === 'ok' ? 'Online' : 'Offline'}</div>
          <div className="label">Platform Status</div>
        </div>
        <div className="card stat">
          <div className="num">{policies?.length ?? '...'}</div>
          <div className="label">Policies</div>
        </div>
        <div className="card stat">
          <div className="num">{models?.length ?? '...'}</div>
          <div className="label">AI Models</div>
        </div>
        <div className="card stat">
          <div className="num">{events?.length ?? '...'}</div>
          <div className="label">Events</div>
        </div>
        <div className="card stat">
          <div className="num">{tasks?.length ?? '...'}</div>
          <div className="label">Tasks</div>
        </div>
        <div className="card stat">
          <div className="num">{health?.version ?? '...'}</div>
          <div className="label">Version</div>
        </div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3>Recent Events</h3>
        <table>
          <thead><tr><th>Type</th><th>Module</th><th>Time</th></tr></thead>
          <tbody>
            {events && events.slice(0,10).map((e: any) => (
              <tr key={e.id}>
                <td><span className="badge blue">{e.event_type}</span></td>
                <td>{e.source_module}</td>
                <td>{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {(!events || events.length === 0) && <tr><td colSpan={3} className="empty">No events yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
