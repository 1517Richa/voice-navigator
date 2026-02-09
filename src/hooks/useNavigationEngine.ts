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
// API integration example:
// - Google Maps Directions API: https://developers.google.com/maps/documentation/directions
// - OpenRouteService: https://openrouteservice.org/dev/#/api-docs

const getRandomDistance = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateRealisticSteps = (destination: string): NavigationStep[] => {
  // Generate more realistic pedestrian navigation steps
  const stepTemplates = [
    { instruction: `Starting navigation to ${destination}. Walk forward.`, maneuver: 'start' },
    { instruction: 'Continue straight along the sidewalk.', maneuver: 'straight' },
    { instruction: 'Cross at the pedestrian crossing ahead.', maneuver: 'crossing' },
    { instruction: 'Turn left at the intersection.', maneuver: 'left' },
    { instruction: 'Walk straight for the next block.', maneuver: 'straight' },
    { instruction: 'Slight right onto the walking path.', maneuver: 'slight-right' },
    { instruction: 'Continue past the bus stop on your right.', maneuver: 'straight' },
    { instruction: 'Turn right after the traffic signal.', maneuver: 'right' },
    { instruction: 'Walk along the main road.', maneuver: 'straight' },
    { instruction: 'Your destination is approaching on the left.', maneuver: 'arriving' },
    { instruction: `You have arrived at ${destination}. The entrance is ahead.`, maneuver: 'arrive' },
  ];

  return stepTemplates.map((template, index) => ({
    instruction: template.instruction,
    distance: index === 0 || index === stepTemplates.length - 1 
      ? '' 
      : `${getRandomDistance(20, 150)} meters`,
    maneuver: template.maneuver,
  }));
};

const simulateRoute = (destination: string): Route => {
  const steps = generateRealisticSteps(destination);
  const totalMeters = steps.reduce((acc, step) => {
    const match = step.distance.match(/(\d+)/);
    return acc + (match ? parseInt(match[1]) : 0);
  }, 0);

  const walkingSpeedMpm = 80; // meters per minute (average walking speed)
  const totalMinutes = Math.ceil(totalMeters / walkingSpeedMpm);

  return {
    steps,
    totalDistance: totalMeters > 1000 
      ? `${(totalMeters / 1000).toFixed(1)} kilometers` 
      : `${totalMeters} meters`,
    totalDuration: totalMinutes > 1 
      ? `${totalMinutes} minutes` 
      : 'less than a minute',
    destination,
  };
};

const simulateNearbySearch = (type: string): { name: string; distance: string } => {
  const places: Record<string, { name: string; distance: string }[]> = {
    hospital: [
      { name: 'City General Hospital', distance: '800 meters' },
      { name: 'District Medical Center', distance: '1.2 kilometers' },
    ],
    medical: [
      { name: 'MedPlus Healthcare', distance: '200 meters' },
      { name: 'Family Medical Store', distance: '350 meters' },
    ],
    pharmacy: [
      { name: 'Apollo Pharmacy', distance: '150 meters' },
      { name: 'MedPlus Pharmacy', distance: '280 meters' },
    ],
    clinic: [
      { name: 'Health First Clinic', distance: '350 meters' },
      { name: 'Community Health Center', distance: '500 meters' },
    ],
    doctor: [
      { name: 'Dr. Sharma Clinic', distance: '400 meters' },
      { name: 'Family Care Doctors', distance: '600 meters' },
    ],
    restaurant: [
      { name: 'City Cafe', distance: '100 meters' },
      { name: 'Food Plaza', distance: '250 meters' },
    ],
    atm: [
      { name: 'State Bank ATM', distance: '80 meters' },
      { name: 'HDFC Bank ATM', distance: '200 meters' },
    ],
    bank: [
      { name: 'State Bank Branch', distance: '300 meters' },
      { name: 'ICICI Bank', distance: '450 meters' },
    ],
  };

  const key = Object.keys(places).find(k => type.toLowerCase().includes(k)) || 'hospital';
  const options = places[key] || places.hospital;
  // Return the closest option
  return options[0];
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
