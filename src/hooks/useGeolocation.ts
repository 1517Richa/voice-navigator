import { useCallback, useEffect, useRef, useState } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null; // m/s
  heading: number | null;
  error: string | null;
  isLoading: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
  getCurrentPosition: () => Promise<GeolocationPosition>;
  watchPosition: () => void;
  clearWatch: () => void;
  isWatching: boolean;
}

// Haversine distance in meters
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    error: null,
    isLoading: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const prevPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unable to get location';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const now = Date.now();

    // Calculate speed from GPS delta if native speed is null
    let computedSpeed = speed;
    if (computedSpeed === null && prevPosRef.current) {
      const dt = (now - prevPosRef.current.time) / 1000;
      if (dt > 0) {
        const dist = haversineDistance(prevPosRef.current.lat, prevPosRef.current.lng, latitude, longitude);
        computedSpeed = dist / dt;
      }
    }

    prevPosRef.current = { lat: latitude, lng: longitude, time: now };

    setState({
      latitude,
      longitude,
      accuracy,
      speed: computedSpeed,
      heading,
      error: null,
      isLoading: false,
    });
  }, []);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        const error = 'Geolocation is not supported';
        setState(prev => ({ ...prev, error, isLoading: false }));
        reject(new Error(error));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePosition(position);
          resolve(position);
        },
        (error) => {
          handleError(error);
          reject(new Error(error.message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [isSupported, handlePosition, handleError]);

  const watchPosition = useCallback(() => {
    if (!isSupported) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const id = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    watchIdRef.current = id;
    setIsWatching(true);
  }, [isSupported, handlePosition, handleError]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    isWatching,
  };
}
