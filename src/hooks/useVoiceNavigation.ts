import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useGeolocation, haversineDistance } from './useGeolocation';
import { useNavigationEngine, type Route, type NavigationStep, formatDistance, formatDuration } from './useNavigationEngine';
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
  userLat: number | null;
  userLng: number | null;
  speed: number | null;
}

export interface VoiceNavigationActions {
  startNewTrip: () => Promise<void>;
  stopNavigation: () => void;
  startListening: () => void;
  stopListening: () => void;
  toggleCamera: () => Promise<void>;
  repeatCurrentInstruction: () => Promise<void>;
}

// Thresholds
const STEP_ARRIVAL_THRESHOLD = 15; // meters to consider "arrived" at a step
const OFF_ROUTE_THRESHOLD = 40; // meters to trigger recalculation
const MIN_MOVEMENT_THRESHOLD = 3; // meters - ignore tiny GPS jitter
const STATIONARY_SPEED = 0.3; // m/s below this = stationary

export function useVoiceNavigation(): [VoiceNavigationState, VoiceNavigationActions] {
  const [phase, setPhase] = useState<NavigationPhase>('init');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [obstacleAlert, setObstacleAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasInitialized = useRef(false);
  const stepIndexRef = useRef(0);
  const lastAnnouncedStepRef = useRef(-1);
  const routeRef = useRef<Route | null>(null);
  const isRecalculating = useRef(false);
  const prevNavPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Core hooks
  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const { 
    startListening, stopListening, transcript, isListening, 
    isSupported: sttSupported, resetTranscript 
  } = useSpeechRecognition();
  const { 
    latitude, longitude, speed, getCurrentPosition, 
    watchPosition, clearWatch 
  } = useGeolocation();
  const { calculateRoute, searchNearby } = useNavigationEngine();
  const { 
    currentObstacle, startDetection, stopDetection, isCameraActive, videoRef 
  } = useObstacleDetection();

  const announce = useCallback(async (message: string, options?: { rate?: number }) => {
    if (ttsSupported) {
      setStatusMessage(message);
      await speak(message, options);
    }
  }, [speak, ttsSupported]);

  const isNearbySearch = useCallback((text: string): boolean => {
    const nearbyKeywords = ['nearest', 'nearby', 'close', 'closest', 'find'];
    const placeTypes = ['hospital', 'medical', 'pharmacy', 'clinic', 'doctor', 'store', 'restaurant', 'atm', 'bank'];
    const lowerText = text.toLowerCase();
    return nearbyKeywords.some(k => lowerText.includes(k)) ||
           placeTypes.some(p => lowerText.includes(p));
  }, []);

  // Movement-based step advancement
  useEffect(() => {
    if (phase !== 'navigating' || !latitude || !longitude || !routeRef.current) return;
    if (isRecalculating.current) return;

    const route = routeRef.current;
    const idx = stepIndexRef.current;

    // Check if user is stationary - stay silent
    const isStationary = speed !== null && speed < STATIONARY_SPEED;

    // Check movement since last nav check
    if (prevNavPosRef.current) {
      const moved = haversineDistance(
        prevNavPosRef.current.lat, prevNavPosRef.current.lng,
        latitude, longitude
      );
      if (moved < MIN_MOVEMENT_THRESHOLD) return; // GPS jitter, skip
    }
    prevNavPosRef.current = { lat: latitude, lng: longitude };

    if (isStationary) return; // Don't process if standing still

    // Check if arrived at current step endpoint
    if (idx < route.steps.length) {
      const stepEnd = route.steps[idx].endLocation;
      const distToStep = haversineDistance(latitude, longitude, stepEnd.lat, stepEnd.lng);

      if (distToStep < STEP_ARRIVAL_THRESHOLD) {
        // Advance to next step
        const nextIdx = idx + 1;
        stepIndexRef.current = nextIdx;
        setCurrentStepIndex(nextIdx);

        if (nextIdx >= route.steps.length) {
          // Arrived
          setPhase('arrived');
          clearWatch();
          stopDetection();
          announce('You have arrived at your destination.');
          return;
        }

        // Announce next step only if not already announced
        if (lastAnnouncedStepRef.current !== nextIdx) {
          lastAnnouncedStepRef.current = nextIdx;
          announce(route.steps[nextIdx].instruction);
        }
        return;
      }

      // Check if off route
      // Find minimum distance to any point on the route geometry
      let minDistToRoute = Infinity;
      if (route.geometry?.coordinates) {
        for (const [lng, lat] of route.geometry.coordinates) {
          const d = haversineDistance(latitude, longitude, lat, lng);
          if (d < minDistToRoute) minDistToRoute = d;
        }
      }

      if (minDistToRoute > OFF_ROUTE_THRESHOLD && !isRecalculating.current) {
        isRecalculating.current = true;
        stopSpeaking();
        announce('You are off route. Recalculating.').then(async () => {
          try {
            const newRoute = await calculateRoute(
              { lat: latitude, lng: longitude },
              route.destination
            );
            routeRef.current = newRoute;
            setCurrentRoute(newRoute);
            stepIndexRef.current = 0;
            setCurrentStepIndex(0);
            lastAnnouncedStepRef.current = 0;
            announce(newRoute.steps[0].instruction);
          } catch {
            announce('Unable to recalculate route.');
          } finally {
            isRecalculating.current = false;
          }
        });
      }
    }
  }, [latitude, longitude, speed, phase, announce, calculateRoute, clearWatch, stopDetection, stopSpeaking]);

  // Process destination and start navigation
  const processDestination = useCallback(async (destination: string) => {
    if (!latitude || !longitude) {
      await announce('Location not available. Please wait.');
      return;
    }

    setPhase('calculating-route');
    let targetDestination = destination;

    if (isNearbySearch(destination)) {
      await announce(`Searching for ${destination}`);
      try {
        const nearby = await searchNearby({ lat: latitude, lng: longitude }, destination);
        targetDestination = nearby.name;
        await announce(`Found ${nearby.name}.`);
      } catch {
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
      
      routeRef.current = route;
      setCurrentRoute(route);
      stepIndexRef.current = 0;
      setCurrentStepIndex(0);
      lastAnnouncedStepRef.current = 0;

      await announce(
        `Route ready. Total distance: ${formatDistance(route.totalDistance)}. ` +
        `Estimated walking time: ${formatDuration(route.totalDuration)}. Starting navigation now.`,
        { rate: 0.85 }
      );

      // Start navigation
      setPhase('navigating');
      watchPosition(); // Start real-time GPS tracking

      try { await startDetection(); } catch { /* camera optional */ }

      // Announce first step
      if (route.steps.length > 0) {
        await announce(route.steps[0].instruction);
      }
    } catch {
      setError('Unable to calculate route');
      await announce('Unable to calculate route. Please try again.');
      setPhase('awaiting-destination');
      setTimeout(() => startListening(), 1500);
    }
  }, [latitude, longitude, announce, calculateRoute, searchNearby, isNearbySearch, startListening, watchPosition, startDetection]);

  // Initialize app
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeApp = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPhase('fetching-location');
      await announce('App opened. Detecting your current location.');

      try {
        await getCurrentPosition();
        setPhase('awaiting-destination');
        await announce('Location detected. Please tell your destination.');
        
        setTimeout(() => {
          if (sttSupported) startListening();
        }, 1500);
      } catch {
        setPhase('error');
        setError('Could not get location');
        await announce('Could not get your location. Please enable location services and refresh the app.');
      }
    };

    initializeApp();

    return () => {
      clearWatch();
      stopDetection();
    };
  }, [announce, getCurrentPosition, sttSupported, startListening, clearWatch, stopDetection]);

  // Handle transcript changes
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
      stopSpeaking();
      announce(alert, { rate: 1.1 });
      setTimeout(() => setObstacleAlert(null), 3500);
    }
  }, [currentObstacle, phase, announce, stopSpeaking]);

  // Actions
  const startNewTrip = useCallback(async () => {
    clearWatch();
    stopDetection();
    setCurrentRoute(null);
    routeRef.current = null;
    setCurrentStepIndex(0);
    stepIndexRef.current = 0;
    lastAnnouncedStepRef.current = -1;
    setError(null);
    setPhase('awaiting-destination');
    await announce('Ready for new destination. Please speak your destination.');
    setTimeout(() => startListening(), 1500);
  }, [announce, startListening, clearWatch, stopDetection]);

  const stopNavigation = useCallback(() => {
    clearWatch();
    stopSpeaking();
    stopDetection();
    setPhase('awaiting-destination');
    setCurrentRoute(null);
    routeRef.current = null;
    setStatusMessage('Navigation stopped');
  }, [clearWatch, stopSpeaking, stopDetection]);

  const toggleCamera = useCallback(async () => {
    if (isCameraActive) {
      stopDetection();
    } else {
      await startDetection();
    }
  }, [isCameraActive, startDetection, stopDetection]);

  const repeatCurrentInstruction = useCallback(async () => {
    if (routeRef.current && currentStepIndex < routeRef.current.steps.length) {
      await announce(routeRef.current.steps[currentStepIndex].instruction);
    }
  }, [currentStepIndex, announce]);

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
    userLat: latitude,
    userLng: longitude,
    speed,
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
