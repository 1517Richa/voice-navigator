import { useState, useCallback, useRef, useEffect } from 'react';

export interface Obstacle {
  type: 'person' | 'vehicle' | 'object' | 'step' | 'unknown';
  direction: 'left' | 'right' | 'center';
  distance: 'near' | 'medium' | 'far';
  confidence: number;
}

interface UseObstacleDetectionReturn {
  isDetecting: boolean;
  isCameraActive: boolean;
  currentObstacle: Obstacle | null;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  isSupported: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

// Simulated obstacle types for demo
const obstacleTypes: Obstacle['type'][] = ['person', 'vehicle', 'object', 'step', 'unknown'];
const directions: Obstacle['direction'][] = ['left', 'right', 'center'];
const distances: Obstacle['distance'][] = ['near', 'medium', 'far'];

export function useObstacleDetection(): UseObstacleDetectionReturn {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentObstacle, setCurrentObstacle] = useState<Obstacle | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  // Simulated object detection - in production, integrate TensorFlow.js or similar
  const simulateDetection = useCallback((): Obstacle | null => {
    // 15% chance of detecting an obstacle during each check
    if (Math.random() < 0.15) {
      return {
        type: obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)],
        direction: directions[Math.floor(Math.random() * directions.length)],
        distance: distances[Math.floor(Math.random() * distances.length)],
        confidence: 0.7 + Math.random() * 0.3, // 70-100% confidence
      };
    }
    return null;
  }, []);

  const startDetection = useCallback(async () => {
    if (!isSupported) {
      setError('Camera not supported on this device');
      return;
    }

    try {
      setError(null);
      
      // Request camera access - prefer back camera for obstacle detection
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsDetecting(true);

      // Start simulated detection loop (every 2 seconds)
      detectionIntervalRef.current = setInterval(() => {
        const obstacle = simulateDetection();
        if (obstacle && obstacle.distance === 'near') {
          setCurrentObstacle(obstacle);
          // Clear obstacle after 3 seconds
          setTimeout(() => setCurrentObstacle(null), 3000);
        }
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      setIsCameraActive(false);
      setIsDetecting(false);
    }
  }, [isSupported, simulateDetection]);

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsDetecting(false);
    setIsCameraActive(false);
    setCurrentObstacle(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isDetecting,
    isCameraActive,
    currentObstacle,
    startDetection,
    stopDetection,
    isSupported,
    error,
    videoRef,
  };
}

// Helper to generate obstacle voice alerts
export function getObstacleAlert(obstacle: Obstacle): string {
  const typeDescriptions: Record<Obstacle['type'], string> = {
    person: 'Person',
    vehicle: 'Vehicle',
    object: 'Object',
    step: 'Step or curb',
    unknown: 'Obstacle',
  };

  const directionInstructions: Record<Obstacle['direction'], string> = {
    left: 'Move slightly to the right',
    right: 'Move slightly to the left',
    center: 'Stop and reassess your path',
  };

  const distanceWarnings: Record<Obstacle['distance'], string> = {
    near: 'immediately ahead',
    medium: 'ahead',
    far: 'in your path',
  };

  return `Warning! ${typeDescriptions[obstacle.type]} detected ${distanceWarnings[obstacle.distance]}. ${directionInstructions[obstacle.direction]}.`;
}
