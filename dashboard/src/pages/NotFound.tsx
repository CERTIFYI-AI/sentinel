import { Link, useNavigate } from 'react-router-dom';
import { WarningCircle, House, ArrowLeft } from '@phosphor-icons/react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ background: 'hsl(var(--bg-page))' }}
    >
      <div className="flex flex-col items-center text-center max-w-sm px-4">
        <WarningCircle size={64} style={{ color: 'hsl(var(--text-4))' }} weight="thin" />

        <h1 className="text-7xl font-bold mt-6 tabular-nums" style={{ color: 'hsl(var(--text-1))' }}>404</h1>
        <p className="text-xl font-semibold mt-3" style={{ color: 'hsl(var(--text-2))' }}>Page not found</p>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>
          The page you're looking for doesn't exist or has been moved to another location.
        </p>

        <div className="flex gap-3 mt-8">
          <Link to="/overview">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] text-white text-sm font-medium transition-colors"
            >
              <House size={14} />
              Go to Dashboard
            </button>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))] text-sm font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
        </div>
      </div>

      <p className="text-xs mt-16" style={{ color: 'hsl(var(--text-4))' }}>
        Certifyi Sentinel GRC Platform
      </p>
    </div>
  );
}
