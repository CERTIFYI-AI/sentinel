import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { WarningCircle, House } from '@phosphor-icons/react';

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ fontFamily: 'Outfit, sans-serif', background: 'hsl(var(--bg-base))' }}
    >
      <WarningCircle size={72} style={{ color: 'hsl(var(--text-4))' }} weight="thin" />

      <h1 className="text-6xl font-bold mt-6" style={{ color: 'hsl(var(--text-1))' }}>404</h1>
      <p className="text-xl font-semibold mt-2" style={{ color: 'hsl(var(--text-2))' }}>Page not found</p>
      <p className="text-sm mt-2 max-w-sm text-center" style={{ color: 'hsl(var(--text-3))' }}>
        The page you are looking for doesn't exist or has been moved to another location.
      </p>

      <div className="flex gap-3 mt-8">
        <Link to="/overview">
          <Button style={{ borderRadius: 0 }}>
            <House size={14} className="mr-1" /> Go to Dashboard
          </Button>
        </Link>
        <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>

      <p className="text-xs mt-12" style={{ color: 'hsl(var(--text-4))' }}>
        Certifyi Sentinel GRC Platform
      </p>
    </div>
  );
}
