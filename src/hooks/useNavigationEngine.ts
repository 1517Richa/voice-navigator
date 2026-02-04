import { useState, useCallback } from 'react';

export interface NavigationStep {
  instruction: string;
  distance: string;
  maneuver: string;
}

export interface Route {
  steps: NavigationStep[];
  totalDistance: string;
  totalDuration: string;
  destination: string;
}

interface UseNavigationEngineReturn {
  route: Route | null;
  currentStep: number;
  isNavigating: boolean;
  calculateRoute: (origin: { lat: number; lng: number }, destination: string) => Promise<Route>;
  startNavigation: () => void;
  nextStep: () => NavigationStep | null;
  stopNavigation: () => void;
  searchNearby: (origin: { lat: number; lng: number }, type: string) => Promise<{ name: string; distance: string }>;
}

// Simulated navigation data for demo purposes
// In production, integrate with Google Maps Directions API or OpenRouteService
const simulateRoute = (destination: string): Route => {
  const steps: NavigationStep[] = [
    { instruction: `Starting navigation to ${destination}`, distance: '', maneuver: 'start' },
    { instruction: 'Walk straight for 50 meters', distance: '50m', maneuver: 'straight' },
    { instruction: 'Turn left at the intersection', distance: '20m', maneuver: 'left' },
    { instruction: 'Continue straight for 100 meters', distance: '100m', maneuver: 'straight' },
    { instruction: 'Turn right onto the main road', distance: '30m', maneuver: 'right' },
    { instruction: 'Walk straight for 200 meters', distance: '200m', maneuver: 'straight' },
    { instruction: 'Your destination is on the left', distance: '10m', maneuver: 'destination' },
    { instruction: `You have arrived at ${destination}`, distance: '', maneuver: 'arrive' },
  ];

  return {
    steps,
    totalDistance: '410 meters',
    totalDuration: '5 minutes',
    destination,
  };
};

const simulateNearbySearch = (type: string): { name: string; distance: string } => {
  const places: Record<string, { name: string; distance: string }> = {
    hospital: { name: 'City General Hospital', distance: '800 meters' },
    medical: { name: 'MedPlus Pharmacy', distance: '200 meters' },
    pharmacy: { name: 'Apollo Pharmacy', distance: '150 meters' },
    clinic: { name: 'Health First Clinic', distance: '350 meters' },
  };

  const key = Object.keys(places).find(k => type.toLowerCase().includes(k)) || 'hospital';
  return places[key];
};

export function useNavigationEngine(): UseNavigationEngineReturn {
  const [route, setRoute] = useState<Route | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const calculateRoute = useCallback(async (
    origin: { lat: number; lng: number },
    destination: string
  ): Promise<Route> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const calculatedRoute = simulateRoute(destination);
    setRoute(calculatedRoute);
    setCurrentStep(0);
    
    return calculatedRoute;
  }, []);

  const startNavigation = useCallback(() => {
    if (route) {
      setIsNavigating(true);
      setCurrentStep(0);
    }
  }, [route]);

  const nextStep = useCallback((): NavigationStep | null => {
    if (!route || currentStep >= route.steps.length - 1) {
      setIsNavigating(false);
      return null;
    }
    
    const next = currentStep + 1;
    setCurrentStep(next);
    return route.steps[next];
  }, [route, currentStep]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRoute(null);
    setCurrentStep(0);
  }, []);

  const searchNearby = useCallback(async (
    origin: { lat: number; lng: number },
    type: string
  ): Promise<{ name: string; distance: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return simulateNearbySearch(type);
  }, []);

  return {
    route,
    currentStep,
    isNavigating,
    calculateRoute,
    startNavigation,
    nextStep,
    stopNavigation,
    searchNearby,
  };
}
