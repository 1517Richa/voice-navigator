import { Heart, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionStatementProps {
  className?: string;
}

export function MissionStatement({ className }: MissionStatementProps) {
  return (
    <header
      className={cn(
        'text-center p-6 rounded-3xl',
        'bg-gradient-to-b from-primary/10 to-transparent',
        'border border-primary/20',
        className
      )}
      role="banner"
      aria-label="Project mission statement"
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <Heart className="w-6 h-6 text-primary" aria-hidden="true" />
        <Volume2 className="w-6 h-6 text-primary animate-pulse" aria-hidden="true" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Voice Navigation Assistant
      </h1>
      
      <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
        A low-cost, AI-powered voice navigation system enabling visually impaired 
        users to walk independently — using voice guidance and smart technology 
        as a modern alternative to traditional blind sticks.
      </p>

      <div 
        className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs"
        aria-hidden="true"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Voice-First • Eyes-Free Navigation
      </div>
    </header>
  );
}
