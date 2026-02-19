import { cn } from '@/lib/utils';
import { Clock, MapPin, Footprints, TrendingDown } from 'lucide-react';

interface WalkingStatsPanelProps {
  totalDistance: number;       // meters (full route)
  totalDuration: number;       // seconds (full route, walking time from OSRM)
  currentStepIndex: number;
  totalSteps: number;
  steps: { distance: number; duration: number }[];
  speed: number | null;        // m/s
  className?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }
  return `${mins} min`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function WalkingStatsPanel({
  totalDistance,
  totalDuration,
  currentStepIndex,
  totalSteps,
  steps,
  speed,
  className,
}: WalkingStatsPanelProps) {
  // Distance covered = sum of completed steps
  const completedDistance = steps
    .slice(0, currentStepIndex)
    .reduce((acc, s) => acc + s.distance, 0);
  const remainingDistance = Math.max(0, totalDistance - completedDistance);

  // Time covered = sum of completed step durations (walking only)
  const completedDuration = steps
    .slice(0, currentStepIndex)
    .reduce((acc, s) => acc + s.duration, 0);
  const remainingDuration = Math.max(0, totalDuration - completedDuration);

  // ETA = now + remaining walking seconds
  const eta = new Date(Date.now() + remainingDuration * 1000);

  // Walking speed: use actual GPS speed if available, else show OSRM estimate
  const walkSpeedKmh = speed != null && speed > 0.3
    ? (speed * 3.6).toFixed(1)
    : null;

  // Progress %
  const progressPct = totalSteps > 1
    ? Math.round((currentStepIndex / (totalSteps - 1)) * 100)
    : 0;

  return (
    <div
      className={cn(
        'w-full rounded-2xl bg-card border border-border p-4 animate-fade-in',
        className
      )}
      role="region"
      aria-label="Walking navigation stats"
    >
      {/* ETA row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary">
          <Clock className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ETA</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-foreground">{formatTime(eta)}</span>
          <span className="text-sm text-muted-foreground ml-2">
            ({formatDuration(remainingDuration)} left)
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Remaining distance */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/40">
          <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Remaining</span>
          <span className="text-sm font-semibold text-foreground">
            {formatDistance(remainingDistance)}
          </span>
        </div>

        {/* Total distance */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/40">
          <TrendingDown className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold text-foreground">
            {formatDistance(totalDistance)}
          </span>
        </div>

        {/* Walking speed */}
        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/40">
          <Footprints className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Speed</span>
          <span className="text-sm font-semibold text-foreground">
            {walkSpeedKmh ? `${walkSpeedKmh} km/h` : speed != null && speed <= 0.3 ? 'Stationary' : '~5 km/h'}
          </span>
        </div>
      </div>

      {/* Journey progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{progressPct}% complete</span>
        </div>
        <div
          className="w-full bg-secondary rounded-full h-2"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Journey ${progressPct}% complete`}
        >
          <div
            className="bg-primary h-2 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
