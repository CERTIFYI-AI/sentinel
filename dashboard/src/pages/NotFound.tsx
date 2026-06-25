import React from 'react';
import { Link } from 'react-router-dom';
import { WarningCircle, ArrowLeft } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-sentinel-background text-sentinel-text">
      <div 
        className="flex flex-col items-center text-center p-8 rounded-lg max-w-md w-full"
        style={{
          background: 'hsl(var(--bg-card))',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: 'hsl(0 72% 51% / 0.1)', color: 'hsl(0 72% 51%)' }}>
          <WarningCircle size={32} weight="fill" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-sentinel-text">404 - Not Found</h1>
        <p className="text-sentinel-text-muted mb-8 text-sm">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="default" className="w-full flex items-center gap-2">
            <ArrowLeft size={16} />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
