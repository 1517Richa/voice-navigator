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
    <div 
      className="relative flex items-center justify-center"
      role="group"
      aria-label="Voice input control"
    >
      {/* Ripple effects when listening */}
      {isListening && (
        <>
          <div 
            className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" 
            aria-hidden="true"
          />
          <div 
            className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" 
            style={{ animationDelay: '0.5s' }} 
            aria-hidden="true"
          />
          <div 
            className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" 
            style={{ animationDelay: '1s' }} 
            aria-hidden="true"
          />
        </>
      )}
      
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={
          disabled 
            ? 'Voice input unavailable - please wait' 
            : isListening 
              ? 'Stop listening for voice input' 
              : 'Start listening for voice input - speak your destination'
        }
        aria-pressed={isListening}
        aria-busy={disabled}
        role="switch"
        aria-checked={isListening}
        className={cn(
          'relative z-10 flex items-center justify-center',
          'w-40 h-40 rounded-full',
          'bg-secondary border-4 border-primary',
          'transition-all duration-300',
          'focus:outline-none focus:ring-4 focus:ring-primary/50',
          'focus-visible:ring-8 focus-visible:ring-primary/70',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-95',
          isListening && 'animate-pulse-glow bg-primary/20',
          className
        )}
      >
        {isListening ? (
          <Mic className="w-20 h-20 text-primary" aria-hidden="true" />
        ) : (
          <MicOff className="w-20 h-20 text-muted-foreground" aria-hidden="true" />
        )}
        
        {/* Screen reader text */}
        <span className="sr-only">
          {isListening 
            ? 'Microphone is active and listening' 
            : 'Microphone is off - tap to start'}
        </span>
      </button>
    </div>
  );
}
