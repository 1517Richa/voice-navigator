import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NavigationStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string;
  modifier: string | null;
  endLocation: { lat: number; lng: number };
}

export interface Route {
  steps: NavigationStep[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  destination: string;
  destLat: number;
  destLng: number;
  geometry: { type: string; coordinates: [number, number][] }; // GeoJSON LineString
}

interface UseNavigationEngineReturn {
  route: Route | null;
  currentStep: number;
  isNavigating: boolean;
  calculateRoute: (origin: { lat: number; lng: number }, destination: string) => Promise<Route>;
  startNavigation: () => void;
  stopNavigation: () => void;
  searchNearby: (origin: { lat: number; lng: number }, type: string) => Promise<{ name: string; lat: number; lon: number }>;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} kilometers`;
  return `${Math.round(meters)} meters`;
}

function formatDuration(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  if (mins > 1) return `${mins} minutes`;
  return 'less than a minute';
}

export function useNavigationEngine(): UseNavigationEngineReturn {
  const [route, setRoute] = useState<Route | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const calculateRoute = useCallback(async (
    origin: { lat: number; lng: number },
    destination: string
  ): Promise<Route> => {
    const { data, error } = await supabase.functions.invoke('get-route', {
      body: {
        originLat: origin.lat,
        originLng: origin.lng,
        destQuery: destination,
      },
    });

    if (error || data?.error) {
      throw new Error(data?.error || error?.message || 'Route calculation failed');
    }

    // Enrich step instructions with readable distances
    const enrichedSteps: NavigationStep[] = data.steps.map((s: any) => ({
      ...s,
      instruction: s.distance > 0
        ? `${s.instruction}. Walk ${formatDistance(s.distance)}.`
        : s.instruction,
    }));

    const routeData: Route = {
      steps: enrichedSteps,
      totalDistance: data.totalDistance,
      totalDuration: data.totalDuration,
      destination: data.destination,
      destLat: data.destLat,
      destLng: data.destLng,
      geometry: data.geometry,
    };

    setRoute(routeData);
    setCurrentStep(0);
    return routeData;
  }, []);

  const startNavigation = useCallback(() => {
    if (route) {
      setIsNavigating(true);
      setCurrentStep(0);
    }
  }, [route]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setRoute(null);
    setCurrentStep(0);
  }, []);

  const searchNearby = useCallback(async (
    origin: { lat: number; lng: number },
    type: string
  ): Promise<{ name: string; lat: number; lon: number }> => {
    const { data, error } = await supabase.functions.invoke('get-route', {
      body: {
        action: 'nearby',
        originLat: origin.lat,
        originLng: origin.lng,
        type,
      },
    });

    if (error || data?.error) {
      throw new Error(data?.error || error?.message || 'Nearby search failed');
    }

    return data;
  }, []);

  return {
    route,
    currentStep,
    isNavigating,
    calculateRoute,
    startNavigation,
    stopNavigation,
    searchNearby,
  };
}

export { formatDistance, formatDuration };
