import { cn } from '@/lib/utils';
import { 
  Navigation, 
  MapPin, 
  Mic, 
  Volume2, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export type AppStatus = 
  | 'initializing'
  | 'fetching-location'
  | 'awaiting-destination'
  | 'listening'
  | 'processing'
  | 'calculating-route'
  | 'navigating'
  | 'obstacle-detected'
  | 'arrived'
  | 'error';

interface StatusDisplayProps {
  status: AppStatus;
  message?: string;
  className?: string;
}

const statusConfig: Record<AppStatus, { icon: React.ReactNode; label: string; color: string }> = {
  'initializing': {
    icon: <Loader2 className="w-8 h-8 animate-spin" />,
    label: 'Starting up...',
    color: 'text-muted-foreground',
  },
  'fetching-location': {
    icon: <MapPin className="w-8 h-8 animate-pulse" />,
    label: 'Getting your location',
    color: 'text-primary',
  },
  'awaiting-destination': {
    icon: <Mic className="w-8 h-8" />,
    label: 'Speak your destination',
    color: 'text-primary',
  },
  'listening': {
    icon: <Mic className="w-8 h-8 animate-pulse" />,
    label: 'Listening...',
    color: 'text-primary',
  },
  'processing': {
    icon: <Loader2 className="w-8 h-8 animate-spin" />,
    label: 'Processing...',
    color: 'text-muted-foreground',
  },
  'calculating-route': {
    icon: <Navigation className="w-8 h-8 animate-pulse" />,
    label: 'Calculating route',
    color: 'text-primary',
  },
  'navigating': {
    icon: <Volume2 className="w-8 h-8" />,
    label: 'Navigation active',
    color: 'text-success',
  },
  'obstacle-detected': {
    icon: <AlertTriangle className="w-8 h-8 animate-pulse" />,
    label: 'Obstacle ahead!',
    color: 'text-destructive',
  },
  'arrived': {
    icon: <CheckCircle className="w-8 h-8" />,
    label: 'You have arrived',
    color: 'text-success',
  },
  'error': {
    icon: <AlertTriangle className="w-8 h-8" />,
    label: 'Error occurred',
    color: 'text-destructive',
  },
};

export function StatusDisplay({ status, message, className }: StatusDisplayProps) {
  const config = statusConfig[status];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex flex-col items-center gap-4 p-6 rounded-2xl',
        'bg-card border border-border',
        'animate-fade-in',
        className
      )}
    >
      <div className={cn('flex items-center justify-center', config.color)}>
        {config.icon}
      </div>
      
      <div className="text-center space-y-2">
        <h2 className={cn('text-2xl font-semibold', config.color)}>
          {config.label}
        </h2>
        
        {message && (
          <p className="text-lg text-muted-foreground max-w-xs">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
