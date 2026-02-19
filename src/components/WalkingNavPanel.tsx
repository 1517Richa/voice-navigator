import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight,
  RotateCcw, RotateCw, Flag, Navigation, Volume2, ChevronRight,
} from 'lucide-react';
import type { NavigationStep } from '@/hooks/useNavigationEngine';

interface WalkingNavPanelProps {
  currentStep: NavigationStep;
  nextStep: NavigationStep | null;
  stepIndex: number;
  totalSteps: number;
  distanceToNext: number | null; // meters remaining in current step (real-time GPS)
  onRepeat: () => void;
  className?: string;
}

// ── Turn icon mapping ────────────────────────────────────────────────────────
type ManeuverKey = string;

function getTurnIcon(maneuver: ManeuverKey, modifier: string | null): React.ReactNode {
  const cls = 'w-14 h-14 drop-shadow-md';
  const mod = modifier?.toLowerCase() ?? '';

  if (maneuver === 'arrive') return <Flag className={cn(cls, 'text-destructive')} />;
  if (maneuver === 'depart') return <Navigation className={cn(cls, 'text-primary')} />;
  if (maneuver === 'roundabout' || maneuver === 'rotary') {
    return mod.includes('left') ? <RotateCcw className={cn(cls, 'text-primary')} /> : <RotateCw className={cn(cls, 'text-primary')} />;
  }
  if (maneuver === 'turn' || maneuver === 'new name' || maneuver === 'merge' || maneuver === 'fork' || maneuver === 'continue') {
    if (mod === 'left' || mod === 'sharp left') return <ArrowLeft className={cn(cls, 'text-primary')} />;
    if (mod === 'right' || mod === 'sharp right') return <ArrowRight className={cn(cls, 'text-primary')} />;
    if (mod === 'slight left') return <ArrowUpLeft className={cn(cls, 'text-primary')} />;
    if (mod === 'slight right') return <ArrowUpRight className={cn(cls, 'text-primary')} />;
    if (mod === 'uturn') return <RotateCcw className={cn(cls, 'text-destructive')} />;
  }
  return <ArrowUp className={cn(cls, 'text-primary')} />;
}

// ── Maneuver label ───────────────────────────────────────────────────────────
function getManeuverLabel(maneuver: string, modifier: string | null): string {
  const mod = modifier?.toLowerCase() ?? '';
  if (maneuver === 'arrive') return 'Arriving';
  if (maneuver === 'depart') return 'Start';
  if (maneuver === 'roundabout' || maneuver === 'rotary') return 'Roundabout';
  if (mod.includes('left')) return mod.includes('slight') ? 'Bear Left' : mod.includes('sharp') ? 'Sharp Left' : 'Turn Left';
  if (mod.includes('right')) return mod.includes('slight') ? 'Bear Right' : mod.includes('sharp') ? 'Sharp Right' : 'Turn Right';
  if (mod === 'uturn') return 'U-Turn';
  return 'Continue';
}

// ── Distance formatter ───────────────────────────────────────────────────────
function fmtDist(m?: number | null): string {
  if (m == null || m <= 0) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

// ── Pulse ring ───────────────────────────────────────────────────────────────
function PulseRing() {
  return (
    <span className="absolute inset-0 rounded-full animate-ping bg-primary/30 pointer-events-none" />
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function WalkingNavPanel({
  currentStep,
  nextStep,
  stepIndex,
  totalSteps,
  distanceToNext,
  onRepeat,
  className,
}: WalkingNavPanelProps) {
  const prevStepRef = useRef(stepIndex);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a short beep when step advances
  const playStepBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (stepIndex !== prevStepRef.current) {
      prevStepRef.current = stepIndex;
      playStepBeep();
    }
  }, [stepIndex, playStepBeep]);

  const progressPct = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const isArriving = currentStep.maneuver === 'arrive';
  const stepDist = fmtDist(distanceToNext ?? currentStep.distance);

  return (
    <div
      className={cn('w-full flex flex-col gap-3 animate-fade-in', className)}
      role="region"
      aria-label="Walking navigation panel"
    >
      {/* ── Current Step Card ─────────────────────────────────────── */}
      <div
        className={cn(
          'relative w-full rounded-3xl overflow-hidden',
          'bg-card border-2',
          isArriving ? 'border-destructive' : 'border-primary',
          'shadow-[var(--glow-primary)] p-6'
        )}
      >
        {/* Step counter badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-secondary rounded-full px-3 py-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Maneuver icon + label */}
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            {!isArriving && <PulseRing />}
            {getTurnIcon(currentStep.maneuver, currentStep.modifier)}
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

        {/* Instruction text */}
        <p
          className="text-xl md:text-2xl font-semibold text-foreground text-center leading-snug mb-4"
          aria-live="assertive"
          aria-atomic="true"
          id="current-nav-instruction"
        >
          {currentStep.instruction}
        </p>

        {/* Distance to next turn */}
        {stepDist && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-3xl font-bold text-primary tabular-nums">{stepDist}</span>
            <span className="text-sm text-muted-foreground">to turn</span>
          </div>
        )}

        {/* Voice-repeat button */}
        <button
          onClick={onRepeat}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-2xl',
            'bg-primary/10 hover:bg-primary/20 active:scale-95',
            'text-primary font-semibold text-base',
            'transition-all duration-150',
            'focus:outline-none focus:ring-4 focus:ring-primary/40'
          )}
          aria-label="Repeat current voice instruction"
        >
          <Volume2 className="w-5 h-5" aria-hidden="true" />
          Repeat Voice Cue
        </button>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────── */}
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
          aria-label={`Next step: ${nextStep.instruction}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            {getTurnIcon(nextStep.maneuver, nextStep.modifier)}
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

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Step {stepIndex + 1} of {totalSteps}: {currentStep.instruction}.
        {stepDist ? ` Walk ${stepDist}.` : ''}
        {nextStep ? ` Then: ${nextStep.instruction}.` : ''}
      </div>
    </div>
  );
}
