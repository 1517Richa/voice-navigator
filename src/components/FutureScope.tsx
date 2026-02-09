import { Glasses, Wifi, Cpu, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FutureScopeProps {
  className?: string;
}

export function FutureScope({ className }: FutureScopeProps) {
  const features = [
    {
      icon: Glasses,
      title: 'Smart AI Lenses',
      description: 'Wearable lenses with built-in cameras replace traditional blind sticks for hands-free navigation.',
    },
    {
      icon: Cpu,
      title: 'Real-Time Object Detection',
      description: 'AI-powered computer vision detects obstacles, people, vehicles, and terrain changes instantly.',
    },
    {
      icon: Wifi,
      title: 'Connected Navigation',
      description: 'Seamless integration with GPS, maps, and voice assistants for comprehensive guidance.',
    },
    {
      icon: Shield,
      title: 'Safety First Design',
      description: 'Proactive alerts and continuous environmental scanning ensure user safety.',
    },
  ];

  return (
    <section
      className={cn('p-6 rounded-3xl bg-card border border-border', className)}
      aria-labelledby="future-scope-heading"
    >
      <h2 
        id="future-scope-heading"
        className="text-xl font-bold text-primary mb-4"
      >
        Future: AI Smart Lenses
      </h2>
      
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
        This prototype demonstrates the foundation for a revolutionary accessibility system. 
        The next phase integrates smart glasses with AI lenses that replace traditional 
        blind sticks entirely — providing real-time obstacle detection, voice navigation, 
        and environmental awareness through wearable technology.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div 
            key={feature.title}
            className="flex flex-col gap-2 p-3 rounded-xl bg-secondary/50"
          >
            <feature.icon 
              className="w-6 h-6 text-primary" 
              aria-hidden="true" 
            />
            <h3 className="text-sm font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <p className="text-sm text-primary font-medium text-center">
          "Empowering independence through AI — walking without a stick, 
          navigating with confidence."
        </p>
      </div>
    </section>
  );
}
