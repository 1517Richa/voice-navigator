import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useGeolocation } from './useGeolocation';
import { useNavigationEngine, type Route, type NavigationStep } from './useNavigationEngine';
import { useObstacleDetection, getObstacleAlert } from './useObstacleDetection';

export type NavigationPhase = 
  | 'init'
  | 'fetching-location'
  | 'awaiting-destination'
  | 'processing'
  | 'calculating-route'
  | 'navigating'
  | 'arrived'
  | 'error';

export interface VoiceNavigationState {
  phase: NavigationPhase;
  statusMessage: string;
  currentRoute: Route | null;
  currentStepIndex: number;
  currentInstruction: NavigationStep | null;
  transcript: string;
  isListening: boolean;
  isSpeaking: boolean;
  obstacleAlert: string | null;
  isCameraActive: boolean;
  error: string | null;
}

export interface VoiceNavigationActions {
  startNewTrip: () => Promise<void>;
  stopNavigation: () => void;
  startListening: () => void;
  stopListening: () => void;
  toggleCamera: () => Promise<void>;
  repeatCurrentInstruction: () => Promise<void>;
}

export function useVoiceNavigation(): [VoiceNavigationState, VoiceNavigationActions] {
  const [phase, setPhase] = useState<NavigationPhase>('init');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [obstacleAlert, setObstacleAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInitialized = useRef(false);
  const navigationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepIndexRef = useRef(0);

  // Core hooks
  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const { 
    startListening, 
    stopListening, 
    transcript, 
    isListening, 
    isSupported: sttSupported,
    resetTranscript 
  } = useSpeechRecognition();
  const { latitude, longitude, getCurrentPosition, error: geoError } = useGeolocation();
  const { calculateRoute, searchNearby } = useNavigationEngine();
  const { 
    currentObstacle, 
    startDetection, 
    stopDetection, 
    isCameraActive,
    videoRef 
  } = useObstacleDetection();

  // Announce message with speech
  const announce = useCallback(async (message: string, options?: { rate?: number }) => {
    if (ttsSupported) {
      setStatusMessage(message);
      await speak(message, options);
    }
  }, [speak, ttsSupported]);

  // Check if destination is a nearby search
  const isNearbySearch = useCallback((text: string): boolean => {
    const nearbyKeywords = ['nearest', 'nearby', 'close', 'closest', 'find'];
    const placeTypes = ['hospital', 'medical', 'pharmacy', 'clinic', 'doctor', 'store', 'restaurant', 'atm', 'bank'];
    const lowerText = text.toLowerCase();
    
    return nearbyKeywords.some(k => lowerText.includes(k)) ||
           placeTypes.some(p => lowerText.includes(p));
  }, []);

  // Start navigation with continuous voice instructions
  const startNavigationSequence = useCallback(async (route: Route) => {
    setPhase('navigating');
    stepIndexRef.current = 0;
    setCurrentStepIndex(0);

    // Start camera detection
    try {
      await startDetection();
    } catch (e) {
      console.log('Camera not available, continuing without obstacle detection');
    }

    const announceStep = async () => {
      if (stepIndexRef.current < route.steps.length) {
        const step = route.steps[stepIndexRef.current];
        setCurrentStepIndex(stepIndexRef.current);
        
        await announce(step.instruction);
        
        stepIndexRef.current++;

        if (stepIndexRef.current >= route.steps.length) {
          setPhase('arrived');
          stopDetection();
          if (navigationIntervalRef.current) {
            clearInterval(navigationIntervalRef.current);
          }
          await announce('You have arrived at your destination. Tap the screen to start a new trip.');
        }
      }
    };

    // Announce first step immediately
    await announceStep();

    // Continue with remaining steps every 6 seconds (simulated walking pace)
    navigationIntervalRef.current = setInterval(announceStep, 6000);
  }, [announce, startDetection, stopDetection]);

  // Process destination and start navigation
  const processDestination = useCallback(async (destination: string) => {
    if (!latitude || !longitude) {
      await announce('Location not available. Please wait.');
      return;
    }

    setPhase('calculating-route');
    let targetDestination = destination;

    // Check for nearby search
    if (isNearbySearch(destination)) {
      await announce(`Searching for ${destination}`);
      try {
        const nearby = await searchNearby({ lat: latitude, lng: longitude }, destination);
        targetDestination = nearby.name;
        await announce(`Found ${nearby.name}, ${nearby.distance} away.`);
      } catch (e) {
        await announce('Could not find nearby locations. Please try again.');
        setPhase('awaiting-destination');
        setTimeout(() => startListening(), 1500);
        return;
      }
    } else {
      await announce(`Calculating walking route to ${destination}`);
    }

    try {
      const route = await calculateRoute(
        { lat: latitude, lng: longitude },
        targetDestination
      );
      
      setCurrentRoute(route);
      
      // Announce route summary
      await announce(
        `Route ready. Total distance: ${route.totalDistance}. ` +
        `Estimated walking time: ${route.totalDuration}. Starting navigation now.`,
        { rate: 0.85 }
      );

      await startNavigationSequence(route);
    } catch (e) {
      setError('Unable to calculate route');
      await announce('Unable to calculate route. Please try again.');
      setPhase('awaiting-destination');
      setTimeout(() => startListening(), 1500);
    }
  }, [latitude, longitude, announce, calculateRoute, searchNearby, isNearbySearch, startListening, startNavigationSequence]);

  // Initialize app - fully automatic voice flow
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeApp = async () => {
      // Wait for voices to load
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPhase('fetching-location');
      await announce('App opened. Detecting your current location.');

      try {
        await getCurrentPosition();
        setPhase('awaiting-destination');
        await announce('Location detected. Please tell your destination.');
        
        // Auto-start listening after announcement
        setTimeout(() => {
          if (sttSupported) {
            startListening();
          }
        }, 1500);
      } catch (e) {
        setPhase('error');
        setError('Could not get location');
        await announce('Could not get your location. Please enable location services and refresh the app.');
      }
    };

    initializeApp();

    return () => {
      if (navigationIntervalRef.current) {
        clearInterval(navigationIntervalRef.current);
      }
      stopDetection();
    };
  }, [announce, getCurrentPosition, sttSupported, startListening, stopDetection]);

  // Handle transcript changes - automatic processing
  useEffect(() => {
    if (transcript && !isListening && phase === 'awaiting-destination') {
      setPhase('processing');
      processDestination(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, phase, processDestination, resetTranscript]);

  // Handle obstacle detection
  useEffect(() => {
    if (currentObstacle && phase === 'navigating') {
      const alert = getObstacleAlert(currentObstacle);
      setObstacleAlert(alert);
      
      // Interrupt current speech and announce obstacle
      stopSpeaking();
      announce(alert, { rate: 1.1 }); // Slightly faster for urgency
      
      setTimeout(() => setObstacleAlert(null), 3500);
    }
  }, [currentObstacle, phase, announce, stopSpeaking]);

  // Actions
  const startNewTrip = useCallback(async () => {
    if (navigationIntervalRef.current) {
      clearInterval(navigationIntervalRef.current);
    }
    stopDetection();
    setCurrentRoute(null);
    setCurrentStepIndex(0);
    stepIndexRef.current = 0;
    setError(null);
    setPhase('awaiting-destination');
    await announce('Ready for new destination. Please speak your destination.');
    setTimeout(() => startListening(), 1500);
  }, [announce, startListening, stopDetection]);

  const stopNavigation = useCallback(() => {
    if (navigationIntervalRef.current) {
      clearInterval(navigationIntervalRef.current);
    }
    stopSpeaking();
    stopDetection();
    setPhase('awaiting-destination');
    setCurrentRoute(null);
    setStatusMessage('Navigation stopped');
  }, [stopSpeaking, stopDetection]);

  const toggleCamera = useCallback(async () => {
    if (isCameraActive) {
      stopDetection();
    } else {
      await startDetection();
    }
  }, [isCameraActive, startDetection, stopDetection]);

  const repeatCurrentInstruction = useCallback(async () => {
    if (currentRoute && currentStepIndex < currentRoute.steps.length) {
      await announce(currentRoute.steps[currentStepIndex].instruction);
    }
  }, [currentRoute, currentStepIndex, announce]);

  const state: VoiceNavigationState = {
    phase,
    statusMessage,
    currentRoute,
    currentStepIndex,
    currentInstruction: currentRoute?.steps[currentStepIndex] || null,
    transcript,
    isListening,
    isSpeaking,
    obstacleAlert,
    isCameraActive,
    error,
  };

  const actions: VoiceNavigationActions = {
    startNewTrip,
    stopNavigation,
    startListening,
    stopListening,
    toggleCamera,
    repeatCurrentInstruction,
  };

  return [state, actions];
}
