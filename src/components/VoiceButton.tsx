import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({ isListening, onClick, disabled, className }: VoiceButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple effects when listening */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" />
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" style={{ animationDelay: '1s' }} />
        </>
      )}
      
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        aria-pressed={isListening}
        className={cn(
          'relative z-10 flex items-center justify-center',
          'w-40 h-40 rounded-full',
          'bg-secondary border-4 border-primary',
          'transition-all duration-300',
          'focus:outline-none focus:ring-4 focus:ring-primary/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isListening && 'animate-pulse-glow bg-primary/20',
          className
        )}
      >
        {isListening ? (
          <Mic className="w-20 h-20 text-primary" />
        ) : (
          <MicOff className="w-20 h-20 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
