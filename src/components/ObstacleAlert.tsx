import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObstacleAlertProps {
  direction: 'left' | 'right' | 'center';
  className?: string;
}

const directionMessages: Record<string, string> = {
  left: 'Obstacle ahead! Move slightly to the right.',
  right: 'Obstacle ahead! Move slightly to the left.',
  center: 'Obstacle directly ahead! Stop and reassess.',
};

export function ObstacleAlert({ direction, className }: ObstacleAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed top-4 left-4 right-4 z-50',
        'flex items-center gap-4 p-6 rounded-2xl',
        'bg-destructive/20 border-2 border-destructive',
        'animate-pulse',
        className
      )}
    >
      <AlertTriangle className="w-10 h-10 text-destructive flex-shrink-0" />
      
      <div className="flex-1">
        <h3 className="text-xl font-bold text-destructive">Warning!</h3>
        <p className="text-lg text-foreground">
          {directionMessages[direction]}
        </p>
      </div>
    </div>
  );
}
