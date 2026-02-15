import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

interface LiveMapProps {
  userLat: number;
  userLng: number;
  destLat?: number;
  destLng?: number;
  routeCoords?: [number, number][]; // [lng, lat] GeoJSON format
  isNavigating?: boolean;
  className?: string;
}

// Custom blue pulsing marker for user location
function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="position:absolute;inset:-8px;background:rgba(37,99,235,0.15);border-radius:50%;animation:pulse 2s ease-in-out infinite;"></div>
        <div style="width:24px;height:24px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.8);opacity:0}}</style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Red destination marker
function createDestIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;">
        <div style="width:14px;height:14px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
        <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);width:2px;height:8px;background:#ef4444;border-radius:1px;"></div>
      </div>
    `,
    iconSize: [20, 28],
    iconAnchor: [10, 28],
  });
}

export function LiveMap({
  userLat, userLng, destLat, destLng, routeCoords, isNavigating = true, className,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const hasFittedBoundsRef = useRef(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([userLat, userLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      errorTileUrl: '',
    }).addTo(map);

    // Force correct sizing after mount
    requestAnimationFrame(() => map.invalidateSize());

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
      polylineRef.current = null;
      hasFittedBoundsRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle container resize
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Update user marker + pan
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], {
        icon: createUserIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
    }

    // Smooth pan to user when actively navigating (after initial bounds fit)
    if (isNavigating && hasFittedBoundsRef.current) {
      map.panTo([userLat, userLng], { animate: true, duration: 0.5 });
    }
  }, [userLat, userLng, isNavigating]);

  // Update destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    if (destLat !== undefined && destLng !== undefined) {
      destMarkerRef.current = L.marker([destLat, destLng], {
        icon: createDestIcon(),
      }).addTo(map);
    }
  }, [destLat, destLng]);

  // Draw route polyline + fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (routeCoords && routeCoords.length > 1) {
      // GeoJSON [lng, lat] → Leaflet [lat, lng]
      const latLngs: L.LatLngExpression[] = routeCoords.map(([lng, lat]) => [lat, lng]);

      polylineRef.current = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);

      // Fit bounds to show full route with padding
      const bounds = polylineRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.8 });
        hasFittedBoundsRef.current = true;
      }

      console.debug('[LiveMap] Route drawn:', routeCoords.length, 'coords, bounds:', bounds.toBBoxString());
    }
  }, [routeCoords]);

  return (
    <div
      ref={containerRef}
      className={cn('rounded-2xl border border-border overflow-hidden', className)}
      style={{ minHeight: 200 }}
      role="img"
      aria-label="Navigation map showing your route"
      aria-hidden="true"
    />
  );
}
