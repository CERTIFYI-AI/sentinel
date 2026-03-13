import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AgentDetail() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setData(Array.isArray(d) ? d : d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Detail</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed agent view with tool policy, trust config, and linked entities</p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
          + Add New
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No items yet</h3>
          <p className="text-sm text-gray-500 mt-2">Create your first agent detail to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((item: any, i: number) => (
                <tr key={item.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name || item.title || `Item ${i+1}`}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">{item.status || 'Active'}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.score || item.compliance_score || '--'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '--'}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-sm text-emerald-600 hover:text-emerald-800">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
