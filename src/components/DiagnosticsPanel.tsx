import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Gauge, MapPin, Clock, Wifi, WifiOff } from 'lucide-react';

interface DiagnosticsPanelProps {
  speed: number | null;
  distanceToNext: number | null;
  totalDistanceRemaining: number | null;
  etaSeconds: number | null;
  accuracy?: number | null;
  onSpeakDiagnostics?: () => void;
  className?: string;
}

function fmtSpeed(mps: number | null): string {
  if (mps === null || mps < 0) return '—';
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

function fmtDist(m: number | null): string {
  if (m === null || m <= 0) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function fmtEta(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return 'Arriving…';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rm = mins % 60;
    return `${hrs}h ${rm}m`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function fmtEtaClock(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '—';
  const arrival = new Date(Date.now() + seconds * 1000);
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SignalDot({ speed }: { speed: number | null }) {
  const active = speed !== null && speed > 0.3;
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full',
      active ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'
    )} />
  );
}

export function DiagnosticsPanel({
  speed,
  distanceToNext,
  totalDistanceRemaining,
  etaSeconds,
  accuracy,
  onSpeakDiagnostics,
  className,
}: DiagnosticsPanelProps) {
  const gpsActive = speed !== null && speed > 0.3;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 space-y-3',
        className
      )}
      role="region"
      aria-label="Live navigation diagnostics"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SignalDot speed={speed} />
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Live Diagnostics
          </h3>
        </div>
        {onSpeakDiagnostics && (
          <button
            onClick={onSpeakDiagnostics}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 rounded px-2 py-1"
            aria-label="Announce diagnostics via voice"
          >
            🔊 Announce
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Speed */}
        <MetricCard
          icon={<Gauge className="w-4 h-4" />}
          label="GPS Speed"
          value={fmtSpeed(speed)}
          sublabel={gpsActive ? 'live' : 'no signal'}
          accent={gpsActive}
        />

        {/* Distance to next */}
        <MetricCard
          icon={<MapPin className="w-4 h-4" />}
          label="Next Waypoint"
          value={fmtDist(distanceToNext)}
          sublabel="distance"
          accent
        />

        {/* ETA */}
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="ETA"
          value={fmtEta(etaSeconds)}
          sublabel={etaSeconds ? `arrive ${fmtEtaClock(etaSeconds)}` : ''}
          accent
        />

        {/* Remaining */}
        <MetricCard
          icon={gpsActive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          label="Remaining"
          value={fmtDist(totalDistanceRemaining)}
          sublabel={accuracy ? `±${Math.round(accuracy)}m acc` : 'total'}
          accent={false}
        />
      </div>

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Speed: {fmtSpeed(speed)}.
        Distance to next waypoint: {fmtDist(distanceToNext)}.
        Estimated arrival: {fmtEta(etaSeconds)}.
        Remaining distance: {fmtDist(totalDistanceRemaining)}.
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  accent: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-secondary/40 rounded-xl py-3 px-2">
      <div className={cn('flex items-center gap-1 text-xs font-medium uppercase tracking-wide', accent ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
        {label}
      </div>
      <span className={cn('text-xl font-bold tabular-nums', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </span>
      {sublabel && (
        <span className="text-[10px] text-muted-foreground">{sublabel}</span>
      )}
    </div>
  );
}
