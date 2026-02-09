import { cn } from '@/lib/utils';
import { Camera, CameraOff, Eye } from 'lucide-react';
import { forwardRef } from 'react';

interface CameraPreviewProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  ({ isActive, onToggle, className }, ref) => {
    return (
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden bg-muted',
          'border-2 border-primary/30',
          className
        )}
        role="region"
        aria-label="Camera obstacle detection preview"
      >
        {/* Video feed - hidden visually but maintains camera access */}
        <video
          ref={ref}
          className={cn(
            'w-full h-full object-cover',
            !isActive && 'hidden'
          )}
          playsInline
          muted
          aria-hidden="true"
        />

        {/* Overlay when camera is active */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex flex-col items-center gap-2 text-primary-foreground">
              <Eye className="w-8 h-8 animate-pulse" aria-hidden="true" />
              <span className="text-sm font-medium">Obstacle Detection Active</span>
            </div>
          </div>
        )}

        {/* Placeholder when camera is off */}
        {!isActive && (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-muted-foreground">
            <CameraOff className="w-12 h-12 mb-2" aria-hidden="true" />
            <p className="text-sm text-center">Camera inactive</p>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className={cn(
            'absolute bottom-3 right-3 p-3 rounded-full',
            'transition-all duration-200',
            'focus:outline-none focus:ring-4 focus:ring-primary/50',
            isActive 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-primary text-primary-foreground'
          )}
          aria-label={isActive ? 'Turn off obstacle detection camera' : 'Turn on obstacle detection camera'}
        >
          {isActive ? (
            <CameraOff className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Camera className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Prototype label */}
        <div 
          className="absolute top-2 left-2 px-2 py-1 bg-secondary/80 rounded text-xs text-secondary-foreground"
          aria-hidden="true"
        >
          Phone Camera Prototype
        </div>
      </div>
    );
  }
);

CameraPreview.displayName = 'CameraPreview';
