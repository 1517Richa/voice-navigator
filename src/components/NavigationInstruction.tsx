import { cn } from '@/lib/utils';
import { Navigation } from 'lucide-react';

interface NavigationInstructionProps {
  instruction: string;
  stepNumber: number;
  totalSteps: number;
  distance?: string;
  className?: string;
}

export function NavigationInstruction({
  instruction,
  stepNumber,
  totalSteps,
  distance,
  className,
}: NavigationInstructionProps) {
  return (
    <div
      role="region"
      aria-label={`Navigation step ${stepNumber} of ${totalSteps}: ${instruction}`}
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'flex flex-col items-center gap-6 p-8 rounded-3xl w-full',
        'bg-card border-2 border-primary',
        'shadow-[var(--glow-primary)]',
        'animate-fade-in',
        className
      )}
    >
      <div 
        className="flex items-center gap-2 text-primary"
        aria-hidden="true"
      >
        <Navigation className="w-6 h-6" />
        <span className="text-sm font-medium">
          Step {stepNumber} of {totalSteps}
        </span>
      </div>

      <p 
        className="text-2xl md:text-3xl font-semibold text-foreground text-center leading-relaxed"
        id="current-navigation-instruction"
      >
        {instruction}
      </p>

      {distance && (
        <span 
          className="text-lg text-muted-foreground"
          aria-label={`Distance: ${distance}`}
        >
          {distance}
        </span>
      )}

      {/* Progress indicator */}
      <div 
        className="w-full max-w-xs bg-secondary rounded-full h-2"
        role="progressbar"
        aria-valuenow={stepNumber}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Navigation progress: step ${stepNumber} of ${totalSteps}`}
      >
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Step {stepNumber} of {totalSteps}. {instruction}. {distance ? `Distance: ${distance}` : ''}
      </div>
    </div>
  );
}
