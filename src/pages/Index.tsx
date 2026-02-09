import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { VoiceButton } from '@/components/VoiceButton';
import { StatusDisplay } from '@/components/StatusDisplay';
import { NavigationInstruction } from '@/components/NavigationInstruction';
import { ObstacleAlert } from '@/components/ObstacleAlert';
import { CameraPreview } from '@/components/CameraPreview';
import { MissionStatement } from '@/components/MissionStatement';
import { FutureScope } from '@/components/FutureScope';
import { useRef } from 'react';
import { useObstacleDetection } from '@/hooks/useObstacleDetection';

const Index = () => {
  const [state, actions] = useVoiceNavigation();
  const { videoRef } = useObstacleDetection();
  
  const {
    phase,
    statusMessage,
    currentRoute,
    currentStepIndex,
    transcript,
    isListening,
    isSpeaking,
    obstacleAlert,
    isCameraActive,
    error,
  } = state;

  const {
    startNewTrip,
    stopNavigation,
    startListening,
    stopListening,
    toggleCamera,
    repeatCurrentInstruction,
  } = actions;

  // Map phase to status display
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

  // Handle mic button click
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else if (phase === 'awaiting-destination' || phase === 'arrived') {
      startListening();
    }
  };

  // Determine obstacle direction from alert
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
      {/* Obstacle Alert - highest priority */}
      {obstacleAlert && (
        <ObstacleAlert direction={getObstacleDirection()} />
      )}

      {/* Skip to main content for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Main Content */}
      <main 
        id="main-content"
        className="flex flex-col items-center gap-6 w-full max-w-md mx-auto"
      >
        {/* Mission Statement - Only on init/awaiting */}
        {(phase === 'init' || phase === 'awaiting-destination' || phase === 'error') && (
          <MissionStatement />
        )}

        {/* Navigation Instruction during active navigation */}
        {phase === 'navigating' && currentRoute && (
          <>
            <NavigationInstruction
              instruction={currentRoute.steps[currentStepIndex]?.instruction || ''}
              stepNumber={currentStepIndex + 1}
              totalSteps={currentRoute.steps.length}
              distance={currentRoute.steps[currentStepIndex]?.distance}
            />

            {/* Camera Preview for obstacle detection */}
            <CameraPreview
              ref={videoRef}
              isActive={isCameraActive}
              onToggle={toggleCamera}
              className="w-full h-48"
            />

            {/* Repeat instruction button */}
            <button
              onClick={repeatCurrentInstruction}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl text-lg font-medium hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-4 focus:ring-secondary/50"
              aria-label="Repeat current navigation instruction"
            >
              Repeat Instruction
            </button>
          </>
        )}

        {/* Status Display */}
        {phase !== 'navigating' && (
          <StatusDisplay
            status={getAppStatus()}
            message={statusMessage || error || (transcript && isListening ? transcript : undefined)}
          />
        )}

        {/* Live transcript display when listening */}
        {isListening && transcript && (
          <div 
            className="text-xl text-primary text-center p-4 bg-card rounded-xl border border-border animate-fade-in w-full"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">You said: </span>
            "{transcript}"
          </div>
        )}

        {/* Voice Button - Primary Interaction */}
        {(phase === 'awaiting-destination' || phase === 'arrived' || phase === 'error') && (
          <div className="flex flex-col items-center gap-4">
            <VoiceButton
              isListening={isListening}
              onClick={handleMicClick}
              disabled={isSpeaking}
            />
            <p 
              className="text-muted-foreground text-center"
              aria-live="polite"
            >
              {isListening 
                ? 'Listening... Speak your destination now' 
                : isSpeaking 
                  ? 'Please wait...' 
                  : 'Tap to speak destination'}
            </p>
          </div>
        )}

        {/* Arrived state with restart option */}
        {phase === 'arrived' && (
          <button
            onClick={startNewTrip}
            className="mt-4 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-primary/50"
            aria-label="Start a new navigation trip"
          >
            Start New Trip
          </button>
        )}

        {/* Stop navigation button */}
        {phase === 'navigating' && (
          <button
            onClick={stopNavigation}
            className="mt-4 px-8 py-4 bg-destructive text-destructive-foreground rounded-xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-destructive/50"
            aria-label="Stop current navigation"
          >
            Stop Navigation
          </button>
        )}

        {/* Future Scope - Show on idle states */}
        {(phase === 'awaiting-destination' || phase === 'arrived') && (
          <FutureScope className="mt-4" />
        )}
      </main>

      {/* Footer */}
      <footer 
        className="fixed bottom-0 left-0 right-0 p-4 text-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm border-t border-border"
        role="contentinfo"
      >
        <p>Voice Navigation Assistant • AI-Powered Accessibility</p>
        <p className="text-xs mt-1">Prototype for Academic Evaluation</p>
      </footer>
    </div>
  );
};

export default Index;
