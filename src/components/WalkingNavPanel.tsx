import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight,
  RotateCcw, RotateCw, Flag, Navigation, Volume2, ChevronRight,
  Timer, PersonStanding,
} from 'lucide-react';
import type { NavigationStep } from '@/hooks/useNavigationEngine';

interface WalkingNavPanelProps {
  currentStep: NavigationStep;
  nextStep: NavigationStep | null;
  stepIndex: number;
  totalSteps: number;
  /** Live meters remaining to the current step's endpoint (updated from GPS) */
  distanceToNext: number | null;
  /** Live GPS speed in m/s — null when unavailable */
  speed: number | null;
  onRepeat: () => void;
  className?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const AVG_WALK_MPS = 1.39; // ~5 km/h default walking speed
const STATIONARY_THRESHOLD = 0.3; // m/s

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTurnIcon(maneuver: string, modifier: string | null, cls: string): React.ReactNode {
  const mod = modifier?.toLowerCase() ?? '';
  if (maneuver === 'arrive') return <Flag className={cn(cls, 'text-destructive')} />;
  if (maneuver === 'depart') return <Navigation className={cn(cls, 'text-primary')} />;
  if (maneuver === 'roundabout' || maneuver === 'rotary') {
    return mod.includes('left')
      ? <RotateCcw className={cn(cls, 'text-primary')} />
      : <RotateCw className={cn(cls, 'text-primary')} />;
  }
  if (['turn', 'new name', 'merge', 'fork', 'continue'].includes(maneuver)) {
    if (mod === 'left' || mod === 'sharp left') return <ArrowLeft className={cn(cls, 'text-primary')} />;
    if (mod === 'right' || mod === 'sharp right') return <ArrowRight className={cn(cls, 'text-primary')} />;
    if (mod === 'slight left') return <ArrowUpLeft className={cn(cls, 'text-primary')} />;
    if (mod === 'slight right') return <ArrowUpRight className={cn(cls, 'text-primary')} />;
    if (mod === 'uturn') return <RotateCcw className={cn(cls, 'text-destructive')} />;
  }
  return <ArrowUp className={cn(cls, 'text-primary')} />;
}

function getManeuverLabel(maneuver: string, modifier: string | null): string {
  const mod = modifier?.toLowerCase() ?? '';
  if (maneuver === 'arrive') return 'Arriving';
  if (maneuver === 'depart') return 'Start Walking';
  if (maneuver === 'roundabout' || maneuver === 'rotary') return 'Roundabout';
  if (mod.includes('left'))  return mod.includes('slight') ? 'Bear Left'  : mod.includes('sharp') ? 'Sharp Left'  : 'Turn Left';
  if (mod.includes('right')) return mod.includes('slight') ? 'Bear Right' : mod.includes('sharp') ? 'Sharp Right' : 'Turn Right';
  if (mod === 'uturn') return 'U-Turn';
  return 'Continue';
}

function fmtDist(m: number | null | undefined): string {
  if (m == null || m <= 0) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

/** Format seconds into human-readable walking time */
function fmtWalkTime(seconds: number): string {
  if (seconds <= 0) return 'Arriving…';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
}

/** Derive effective walking speed — prefer GPS, fall back to average */
function effectiveSpeed(speed: number | null): { mps: number; isGps: boolean } {
  if (speed !== null && speed > STATIONARY_THRESHOLD) {
    return { mps: speed, isGps: true };
  }
  return { mps: AVG_WALK_MPS, isGps: false };
}

// ── SVG countdown ring ───────────────────────────────────────────────────────
function CountdownRing({ progress }: { progress: number }) {
  // progress: 0 (just started) → 1 (arrived)
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg
      className="absolute inset-0 w-full h-full -rotate-90"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {/* Track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" />
      {/* Progress arc */}
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  );
}

// ── Pace badge ───────────────────────────────────────────────────────────────
function PaceBadge({ speed }: { speed: number | null }) {
  const isStationary = speed === null || speed <= STATIONARY_THRESHOLD;
  const kmh = speed != null ? speed * 3.6 : 0;

  let label: string;
  let colorClass: string;

  if (isStationary) {
    label = 'Stationary';
    colorClass = 'text-muted-foreground bg-secondary';
  } else if (kmh < 4) {
    label = `Slow  ${kmh.toFixed(1)} km/h`;
    colorClass = 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
  } else if (kmh <= 7) {
    label = `Walking  ${kmh.toFixed(1)} km/h`;
    colorClass = 'text-primary bg-primary/10';
  } else {
    label = `Fast  ${kmh.toFixed(1)} km/h`;
    colorClass = 'text-green-600 bg-green-100 dark:bg-green-900/30';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
        colorClass
      )}
      aria-label={`Current pace: ${label}`}
    >
      <PersonStanding className="w-3.5 h-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function WalkingNavPanel({
  currentStep,
  nextStep,
  stepIndex,
  totalSteps,
  distanceToNext,
  speed,
  onRepeat,
  className,
}: WalkingNavPanelProps) {
  const prevStepRef = useRef(stepIndex);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Track the initial distance when a new step starts (for ring progress)
  const stepInitDistRef = useRef<number | null>(null);

  const playStepBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* ignore */ }
  }, []);

  // When step index changes, reset initial distance reference & play beep
  useEffect(() => {
    if (stepIndex !== prevStepRef.current) {
      prevStepRef.current = stepIndex;
      stepInitDistRef.current = null; // reset
      playStepBeep();
    }
  }, [stepIndex, playStepBeep]);

  // Set initial distance the first time we get a reading for this step
  if (distanceToNext !== null && stepInitDistRef.current === null) {
    stepInitDistRef.current = distanceToNext;
  }

  // Compute ring progress: 0 = just started, 1 = arrived
  const ringProgress =
    stepInitDistRef.current && stepInitDistRef.current > 0 && distanceToNext !== null
      ? 1 - distanceToNext / stepInitDistRef.current
      : 0;

  // Compute time-to-next-turn
  const { mps, isGps } = effectiveSpeed(speed);
  const isStationary = speed !== null && speed <= STATIONARY_THRESHOLD;
  const dist = distanceToNext ?? currentStep.distance;
  const secsToTurn = dist > 0 && !isStationary ? dist / mps : null;

  const progressPct = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const isArriving = currentStep.maneuver === 'arrive';

  return (
    <div
      className={cn('w-full flex flex-col gap-3 animate-fade-in', className)}
      role="region"
      aria-label="Walking navigation panel"
    >
      {/* ── Current Step Card ─────────────────────────────────────── */}
      <div
        className={cn(
          'relative w-full rounded-3xl bg-card border-2 p-6',
          isArriving ? 'border-destructive' : 'border-primary',
          'shadow-[var(--glow-primary)]'
        )}
      >
        {/* Step badge */}
        <div className="absolute top-4 right-4 bg-secondary rounded-full px-3 py-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Pace badge */}
        <div className="flex justify-center mb-4">
          <PaceBadge speed={speed} />
        </div>

        {/* Maneuver icon with countdown ring */}
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <CountdownRing progress={ringProgress} />
            <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {getTurnIcon(currentStep.maneuver, currentStep.modifier, 'w-9 h-9')}
            </div>
          </div>
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-widest',
              isArriving ? 'text-destructive' : 'text-primary'
            )}
          >
            {getManeuverLabel(currentStep.maneuver, currentStep.modifier)}
          </span>
        </div>

        {/* Instruction */}
        <p
          className="text-xl md:text-2xl font-semibold text-foreground text-center leading-snug mb-5"
          aria-live="assertive"
          aria-atomic="true"
        >
          {currentStep.instruction}
        </p>

        {/* ── Live distance + time block ─────────────────────────── */}
        {dist > 0 && (
          <div className="flex items-stretch gap-3 mb-5">
            {/* Distance */}
            <div className="flex-1 flex flex-col items-center gap-0.5 bg-secondary/50 rounded-2xl py-3 px-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Distance
              </span>
              <span
                className="text-2xl font-bold text-primary tabular-nums"
                aria-live="polite"
                aria-label={`${fmtDist(distanceToNext ?? dist)} to turn`}
              >
                {fmtDist(distanceToNext ?? dist)}
              </span>
              <span className="text-xs text-muted-foreground">to turn</span>
            </div>

            {/* Walking time */}
            <div className="flex-1 flex flex-col items-center gap-0.5 bg-secondary/50 rounded-2xl py-3 px-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                <Timer className="w-3 h-3" aria-hidden="true" />
                Walk Time
              </span>
              <span
                className="text-2xl font-bold text-foreground tabular-nums text-center"
                aria-live="polite"
                aria-label={`Walking time: ${secsToTurn != null ? fmtWalkTime(secsToTurn) : 'Calculating'}`}
              >
                {isStationary
                  ? '—'
                  : secsToTurn != null
                    ? fmtWalkTime(secsToTurn)
                    : '…'}
              </span>
              <span className="text-xs text-muted-foreground">
                {isStationary ? 'resume walking' : isGps ? 'at your pace' : 'est. avg'}
              </span>
            </div>
          </div>
        )}

        {/* Voice-repeat button */}
        <button
          onClick={onRepeat}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-2xl',
            'bg-primary/10 hover:bg-primary/20 active:scale-95',
            'text-primary font-semibold text-base transition-all duration-150',
            'focus:outline-none focus:ring-4 focus:ring-primary/40'
          )}
          aria-label="Repeat current voice instruction"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          Repeat Voice Cue
        </button>
      </div>

      {/* ── Route progress bar ───────────────────────────────────── */}
      <div className="w-full px-1 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Route progress</span>
          <span>{progressPct}%</span>
        </div>
        <div
          className="w-full bg-secondary rounded-full h-2.5"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Route ${progressPct}% complete`}
        >
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Next Step Preview ─────────────────────────────────────── */}
      {nextStep && (
        <div
          className="w-full rounded-2xl bg-secondary/40 border border-border px-4 py-3 flex items-center gap-3"
          aria-label={`Next: ${nextStep.instruction}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            {getTurnIcon(nextStep.maneuver, nextStep.modifier, 'w-4 h-4')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              Then
            </p>
            <p className="text-sm text-foreground truncate">{nextStep.instruction}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      )}

      {/* Screen-reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Step {stepIndex + 1} of {totalSteps}: {currentStep.instruction}.
        {fmtDist(distanceToNext ?? currentStep.distance)
          ? ` Walk ${fmtDist(distanceToNext ?? currentStep.distance)}.`
          : ''}
        {secsToTurn != null ? ` Estimated walk time: ${fmtWalkTime(secsToTurn)}.` : ''}
        {nextStep ? ` Then: ${nextStep.instruction}.` : ''}
      </div>
    </div>
  );
}
