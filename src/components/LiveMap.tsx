import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

interface LiveMapProps {
  userLat: number;
  userLng: number;
  destLat?: number;
  destLng?: number;
  routeCoords?: [number, number][]; // [lng, lat] GeoJSON format
  className?: string;
}

export function LiveMap({ userLat, userLng, destLat, destLng, routeCoords, className }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([userLat, userLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.circleMarker([userLat, userLng], {
        radius: 10,
        fillColor: '#f59e0b',
        fillOpacity: 1,
        color: '#fff',
        weight: 3,
      }).addTo(map);
    }

    map.panTo([userLat, userLng], { animate: true });
  }, [userLat, userLng]);

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
        icon: L.divIcon({
          className: '',
          html: '<div style="width:20px;height:20px;background:#ef4444;border:3px solid #fff;border-radius:50%;"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(map);
    }
  }, [destLat, destLng]);

  // Update polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (routeCoords && routeCoords.length > 1) {
      // GeoJSON coords are [lng, lat], Leaflet needs [lat, lng]
      const latLngs: L.LatLngExpression[] = routeCoords.map(([lng, lat]) => [lat, lng]);
      polylineRef.current = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 5,
        opacity: 0.8,
      }).addTo(map);

      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [routeCoords]);

  return (
    <div
      ref={mapContainerRef}
      className={cn('rounded-2xl border border-border overflow-hidden', className)}
      role="img"
      aria-label="Navigation map showing your route"
      aria-hidden="true"
    />
  );
}
