import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { VoiceButton } from '@/components/VoiceButton';
import { StatusDisplay } from '@/components/StatusDisplay';
import { ObstacleAlert } from '@/components/ObstacleAlert';
import { CameraPreview } from '@/components/CameraPreview';
import { MissionStatement } from '@/components/MissionStatement';
import { FutureScope } from '@/components/FutureScope';
import { LiveMap } from '@/components/LiveMap';
import { WalkingStatsPanel } from '@/components/WalkingStatsPanel';
import { WalkingNavPanel } from '@/components/WalkingNavPanel';
import { DiagnosticsPanel } from '@/components/DiagnosticsPanel';
import { useObstacleDetection } from '@/hooks/useObstacleDetection';
import { haversineDistance } from '@/hooks/useGeolocation';

const Index = () => {
  const [state, actions] = useVoiceNavigation();
  const { videoRef } = useObstacleDetection();
  
  const {
    phase, statusMessage, currentRoute, currentStepIndex,
    transcript, isListening, isSpeaking, obstacleAlert,
    isCameraActive, error, userLat, userLng, speed,
  } = state;

  const {
    startNewTrip, stopNavigation, startListening,
    stopListening, toggleCamera, repeatCurrentInstruction,
  } = actions;

  const getAppStatus = () => {
    switch (phase) {
      case 'init':
      case 'fetching-location':
        return 'fetching-location';
      case 'awaiting-destination':
        return isListening ? 'listening' : 'awaiting-destination';
      case 'processing':
      case 'calculating-route':
        return 'calculating-route';
      case 'navigating':
        return obstacleAlert ? 'obstacle-detected' : 'navigating';
      case 'arrived':
        return 'arrived';
      case 'error':
        return 'error';
      default:
        return 'initializing';
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else if (phase === 'awaiting-destination' || phase === 'arrived') {
      startListening();
    }
  };

  const getObstacleDirection = (): 'left' | 'right' | 'center' => {
    if (!obstacleAlert) return 'center';
    if (obstacleAlert.includes('right')) return 'left';
    if (obstacleAlert.includes('left')) return 'right';
    return 'center';
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col p-4 pb-20"
      role="application"
      aria-label="Voice Navigation Assistant - AI-powered navigation for visually impaired users"
    >
      {obstacleAlert && <ObstacleAlert direction={getObstacleDirection()} />}

      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
      >
        Skip to main content
      </a>

      <main id="main-content" className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        {/* Mission Statement - Only on idle states */}
        {(phase === 'init' || phase === 'awaiting-destination' || phase === 'error') && (
          <MissionStatement />
        )}

        {/* Active navigation */}
        {phase === 'navigating' && currentRoute && (() => {
          const currentStep = currentRoute.steps[currentStepIndex];
          const nextStep = currentRoute.steps[currentStepIndex + 1] ?? null;

          const distanceToNext =
            userLat && userLng && currentStep?.endLocation
              ? haversineDistance(userLat, userLng, currentStep.endLocation.lat, currentStep.endLocation.lng)
              : null;

          // Remaining distance: sum of remaining steps
          const remainingDist = currentRoute.steps
            .slice(currentStepIndex)
            .reduce((sum, s) => sum + (s.distance ?? 0), 0);

          const effectiveSpeed = speed && speed > 0.3 ? speed : 1.39;
          const etaSeconds = remainingDist > 0 ? remainingDist / effectiveSpeed : null;

          const speakDiagnostics = () => {
            const parts: string[] = [];
            if (speed !== null) parts.push(`Current speed: ${(speed * 3.6).toFixed(1)} kilometers per hour.`);
            if (distanceToNext !== null) parts.push(`Distance to next turn: ${distanceToNext >= 1000 ? `${(distanceToNext / 1000).toFixed(1)} kilometers` : `${Math.round(distanceToNext)} meters`}.`);
            if (etaSeconds !== null) {
              const mins = Math.floor(etaSeconds / 60);
              parts.push(`Estimated arrival in ${mins > 0 ? `${mins} minutes` : `${Math.round(etaSeconds)} seconds`}.`);
            }
            if (parts.length > 0) {
              const msg = parts.join(' ');
              window.speechSynthesis?.cancel();
              const utter = new SpeechSynthesisUtterance(msg);
              utter.rate = 0.9;
              window.speechSynthesis?.speak(utter);
            }
          };

          return (
            <>
              <WalkingNavPanel
                currentStep={currentStep}
                nextStep={nextStep}
                stepIndex={currentStepIndex}
                totalSteps={currentRoute.steps.length}
                distanceToNext={distanceToNext}
                speed={speed}
                onRepeat={repeatCurrentInstruction}
              />

              <DiagnosticsPanel
                speed={speed}
                distanceToNext={distanceToNext}
                totalDistanceRemaining={remainingDist}
                etaSeconds={etaSeconds}
                onSpeakDiagnostics={speakDiagnostics}
              />

              <WalkingStatsPanel
                totalDistance={currentRoute.totalDistance}
                totalDuration={currentRoute.totalDuration}
                currentStepIndex={currentStepIndex}
                totalSteps={currentRoute.steps.length}
                steps={currentRoute.steps}
                speed={speed}
              />

              {userLat && userLng && (
                <LiveMap
                  userLat={userLat}
                  userLng={userLng}
                  destLat={currentRoute.destLat}
                  destLng={currentRoute.destLng}
                  routeCoords={currentRoute.geometry?.coordinates}
                  className="w-full h-80"
                />
              )}

              <CameraPreview
                ref={videoRef}
                isActive={isCameraActive}
                onToggle={toggleCamera}
                className="w-full h-48"
              />
            </>
          );
        })()}

        {/* Status Display */}
        {phase !== 'navigating' && (
          <StatusDisplay
            status={getAppStatus()}
            message={statusMessage || error || (transcript && isListening ? transcript : undefined)}
          />
        )}

        {/* Live transcript */}
        {isListening && transcript && (
          <div 
            className="text-xl text-primary text-center p-4 bg-card rounded-xl border border-border animate-fade-in w-full"
            role="status" aria-live="polite" aria-atomic="true"
          >
            <span className="sr-only">You said: </span>
            "{transcript}"
          </div>
        )}

        {/* Voice Button */}
        {(phase === 'awaiting-destination' || phase === 'arrived' || phase === 'error') && (
          <div className="flex flex-col items-center gap-4">
            <VoiceButton isListening={isListening} onClick={handleMicClick} disabled={isSpeaking} />
            <p className="text-muted-foreground text-center" aria-live="polite">
              {isListening ? 'Listening... Speak your destination now' : isSpeaking ? 'Please wait...' : 'Tap to speak destination'}
            </p>
          </div>
        )}

        {phase === 'arrived' && (
          <button
            onClick={startNewTrip}
            className="mt-4 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-primary/50"
            aria-label="Start a new navigation trip"
          >
            Start New Trip
          </button>
        )}

        {phase === 'navigating' && (
          <button
            onClick={stopNavigation}
            className="mt-4 px-8 py-4 bg-destructive text-destructive-foreground rounded-xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-destructive/50"
            aria-label="Stop current navigation"
          >
            Stop Navigation
          </button>
        )}

        {(phase === 'awaiting-destination' || phase === 'arrived') && (
          <FutureScope className="mt-4" />
        )}
      </main>

      <footer 
        className="fixed bottom-0 left-0 right-0 p-4 text-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm border-t border-border"
        role="contentinfo"
      >
        <p>Voice Navigation Assistant • AI-Powered Accessibility</p>
        <p className="text-xs mt-1">Real-time adaptive navigation for visually impaired users</p>
      </footer>
    </div>
  );
};

export default Index;
