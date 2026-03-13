import { useApi } from '../hooks';
export default function TrustEngine() {
  const { data: score } = useApi<any>('/trust-engine/score');
  const { data: traces } = useApi<any[]>('/trust-engine/traces');
  return (<div>
    <h1 className="page-title">Trust Engine</h1>
    <div className="grid">
      <div className="card stat"><div className="score-ring" style={{background: `conic-gradient(var(--accent) ${(score?.overall_score||0)*3.6}deg, var(--bg3) 0deg)`}}>{score?.overall_score ?? '...'}</div><div className="label">Overall Trust Score</div></div>
      <div className="card stat"><div className="num">{score?.policy_score ?? '...'}</div><div className="label">Policy Score</div></div>
      <div className="card stat"><div className="num">{score?.model_score ?? '...'}</div><div className="label">Model Score</div></div>
      <div className="card stat"><div className="num">{score?.control_score ?? '...'}</div><div className="label">Control Score</div></div>
    </div>
    <div className="card"><h3>Trust Traces</h3><table><thead><tr><th>Module</th><th>Action</th><th>Score Delta</th><th>Time</th></tr></thead><tbody>
      {traces&&traces.length>0?traces.map((t:any)=>(<tr key={t.id}><td>{t.source_module}</td><td>{t.action}</td><td>{t.score_delta>0?'+':''}{t.score_delta}</td><td>{new Date(t.created_at).toLocaleString()}</td></tr>)):<tr><td colSpan={4} className="empty">No traces</td></tr>}
    </tbody></table></div>
  </div>);
}
