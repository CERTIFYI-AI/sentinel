import { Component, ReactNode } from 'react';
import { Warning, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';

interface Props { children: ReactNode; fallbackTitle?: string; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  handleRetry = () => { this.setState({ hasError: false, error: null }); window.location.reload(); };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Warning size={48} className="text-destructive" />
          <h2 className="text-lg font-semibold">{this.props.fallbackTitle || 'Something went wrong'}</h2>
          <p className="text-muted-foreground text-sm max-w-md text-center">{this.state.error?.message || 'Failed to load this page.'}</p>
          <Button onClick={this.handleRetry} variant="outline" className="gap-2"><ArrowClockwise size={16} />Retry</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
