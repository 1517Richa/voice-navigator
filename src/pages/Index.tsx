import { useEffect, useState, useCallback, useRef } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNavigationEngine, type Route } from '@/hooks/useNavigationEngine';
import { VoiceButton } from '@/components/VoiceButton';
import { StatusDisplay, type AppStatus } from '@/components/StatusDisplay';
import { NavigationInstruction } from '@/components/NavigationInstruction';
import { ObstacleAlert } from '@/components/ObstacleAlert';

type NavigationPhase = 
  | 'init'
  | 'location'
  | 'destination'
  | 'route'
  | 'navigate'
  | 'arrived';

const Index = () => {
  const [phase, setPhase] = useState<NavigationPhase>('init');
  const [appStatus, setAppStatus] = useState<AppStatus>('initializing');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showObstacle, setShowObstacle] = useState(false);
  const [obstacleDirection, setObstacleDirection] = useState<'left' | 'right' | 'center'>('center');
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [navigationStepIndex, setNavigationStepIndex] = useState(0);
  
  const hasInitialized = useRef(false);
  const navigationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { speak, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const { 
    startListening, 
    stopListening, 
    transcript, 
    isListening, 
    isSupported: sttSupported,
    resetTranscript 
  } = useSpeechRecognition();
  const { latitude, longitude, getCurrentPosition } = useGeolocation();
  const { calculateRoute, searchNearby } = useNavigationEngine();

  // Announce message with speech
  const announce = useCallback(async (message: string) => {
    if (ttsSupported) {
      await speak(message);
    }
  }, [speak, ttsSupported]);

  // Check if destination is a nearby search
  const isNearbySearch = useCallback((text: string): boolean => {
    const nearbyKeywords = ['nearest', 'nearby', 'close', 'closest'];
    const placeTypes = ['hospital', 'medical', 'pharmacy', 'clinic', 'doctor', 'store'];
    const lowerText = text.toLowerCase();
    
    return nearbyKeywords.some(k => lowerText.includes(k)) ||
           placeTypes.some(p => lowerText.includes(p));
  }, []);

  // Process destination
  const processDestination = useCallback(async (destination: string) => {
    if (!latitude || !longitude) return;

    setPhase('route');
    setAppStatus('calculating-route');
    
    let targetDestination = destination;

    // Check for nearby search
    if (isNearbySearch(destination)) {
      await announce(`Searching for ${destination}`);
      const nearby = await searchNearby({ lat: latitude, lng: longitude }, destination);
      targetDestination = nearby.name;
      await announce(`Found ${nearby.name}, ${nearby.distance} away. Starting navigation.`);
    } else {
      await announce(`Calculating route to ${destination}`);
    }

    try {
      const route = await calculateRoute(
        { lat: latitude, lng: longitude },
        targetDestination
      );
      
      setCurrentRoute(route);
      setNavigationStepIndex(0);
      
      await announce(
        `Route calculated. Total distance: ${route.totalDistance}. ` +
        `Estimated time: ${route.totalDuration}. Starting navigation now.`
      );

      setPhase('navigate');
      setAppStatus('navigating');
      startNavigation(route);
    } catch (error) {
      setAppStatus('error');
      await announce('Unable to calculate route. Please try again.');
      setPhase('destination');
    }
  }, [latitude, longitude, announce, calculateRoute, searchNearby, isNearbySearch]);

  // Start navigation with voice instructions
  const startNavigation = useCallback((route: Route) => {
    let stepIndex = 0;

    const announceStep = async () => {
      if (stepIndex < route.steps.length) {
        const step = route.steps[stepIndex];
        setNavigationStepIndex(stepIndex);
        setStatusMessage(step.instruction);
        
        await announce(step.instruction);
        
        // Simulate obstacle detection randomly (10% chance)
        if (Math.random() < 0.1 && stepIndex > 0 && stepIndex < route.steps.length - 1) {
          const directions: ('left' | 'right' | 'center')[] = ['left', 'right', 'center'];
          const randomDirection = directions[Math.floor(Math.random() * directions.length)];
          setObstacleDirection(randomDirection);
          setShowObstacle(true);
          setAppStatus('obstacle-detected');
          
          await announce(
            randomDirection === 'center' 
              ? 'Obstacle directly ahead. Please stop and reassess.'
              : `Obstacle detected. Move slightly to the ${randomDirection === 'left' ? 'right' : 'left'}.`
          );
          
          setTimeout(() => {
            setShowObstacle(false);
            setAppStatus('navigating');
          }, 3000);
        }

        stepIndex++;

        if (stepIndex >= route.steps.length) {
          setPhase('arrived');
          setAppStatus('arrived');
          if (navigationIntervalRef.current) {
            clearInterval(navigationIntervalRef.current);
          }
        }
      }
    };

    // Announce first step immediately
    announceStep();

    // Continue with remaining steps every 5 seconds (simulated)
    navigationIntervalRef.current = setInterval(announceStep, 6000);
  }, [announce]);

  // Initialize app on load
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      // Wait a moment for voices to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await announce('App opened. Fetching your current location.');
      setPhase('location');
      setAppStatus('fetching-location');

      try {
        await getCurrentPosition();
        setAppStatus('awaiting-destination');
        await announce('Location detected. Please tell your destination.');
        setPhase('destination');
        
        // Auto-start listening after announcement
        setTimeout(() => {
          if (sttSupported) {
            startListening();
          }
        }, 1500);
      } catch (error) {
        setAppStatus('error');
        setStatusMessage('Could not get location. Please enable location services.');
        await announce('Could not get your location. Please enable location services and refresh.');
      }
    };

    init();

    return () => {
      if (navigationIntervalRef.current) {
        clearInterval(navigationIntervalRef.current);
      }
    };
  }, [announce, getCurrentPosition, sttSupported, startListening]);

  // Handle transcript changes
  useEffect(() => {
    if (transcript && !isListening && phase === 'destination') {
      processDestination(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, phase, processDestination, resetTranscript]);

  // Handle mic button click
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else if (phase === 'destination' || phase === 'arrived') {
      setAppStatus('listening');
      startListening();
    }
  };

  // Restart navigation
  const handleRestart = async () => {
    if (navigationIntervalRef.current) {
      clearInterval(navigationIntervalRef.current);
    }
    setCurrentRoute(null);
    setNavigationStepIndex(0);
    setPhase('destination');
    setAppStatus('awaiting-destination');
    await announce('Ready for new destination. Please speak your destination.');
    setTimeout(() => startListening(), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Obstacle Alert */}
      {showObstacle && <ObstacleAlert direction={obstacleDirection} />}

      {/* Main Content */}
      <main className="flex flex-col items-center gap-8 w-full max-w-md">
        {/* App Title - minimal for screen readers */}
        <h1 className="sr-only">Voice Navigation Assistant</h1>

        {/* Navigation Instruction during active navigation */}
        {phase === 'navigate' && currentRoute && (
          <NavigationInstruction
            instruction={currentRoute.steps[navigationStepIndex]?.instruction || ''}
            stepNumber={navigationStepIndex + 1}
            totalSteps={currentRoute.steps.length}
            distance={currentRoute.steps[navigationStepIndex]?.distance}
          />
        )}

        {/* Status Display */}
        {phase !== 'navigate' && (
          <StatusDisplay
            status={appStatus}
            message={statusMessage || (transcript && isListening ? transcript : undefined)}
          />
        )}

        {/* Live transcript display when listening */}
        {isListening && transcript && (
          <div 
            className="text-xl text-primary text-center p-4 bg-card rounded-xl border border-border animate-fade-in"
            aria-live="polite"
          >
            "{transcript}"
          </div>
        )}

        {/* Voice Button - Primary Interaction */}
        {(phase === 'destination' || phase === 'arrived') && (
          <div className="flex flex-col items-center gap-4">
            <VoiceButton
              isListening={isListening}
              onClick={handleMicClick}
              disabled={isSpeaking}
            />
            <p className="text-muted-foreground text-center">
              {isListening ? 'Listening... Speak now' : 'Tap to speak destination'}
            </p>
          </div>
        )}

        {/* Arrived state with restart option */}
        {phase === 'arrived' && (
          <button
            onClick={handleRestart}
            className="mt-4 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-primary/50"
          >
            Start New Trip
          </button>
        )}

        {/* Stop navigation button */}
        {phase === 'navigate' && (
          <button
            onClick={handleRestart}
            className="mt-4 px-8 py-4 bg-destructive text-destructive-foreground rounded-xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-destructive/50"
          >
            Stop Navigation
          </button>
        )}
      </main>

      {/* Footer - Project info for developers */}
      <footer className="fixed bottom-4 left-4 right-4 text-center text-sm text-muted-foreground">
        <p>Voice Navigation • AI-Powered Accessibility</p>
      </footer>
    </div>
  );
};

export default Index;
