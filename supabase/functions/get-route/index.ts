import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RouteRequest {
  originLat: number;
  originLng: number;
  destLat?: number;
  destLng?: number;
  destQuery?: string;
}

// Geocode a text query using Nominatim
async function geocode(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'VoiceNavigator/1.0' },
  });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name };
  }
  return null;
}

// Get walking route from OSRM
async function getRoute(originLat: number, originLng: number, destLat: number, destLng: number) {
  const url = `https://router.project-osrm.org/route/v1/foot/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&annotations=true`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    return null;
  }

  const route = data.routes[0];
  const legs = route.legs[0];

  const steps = legs.steps.map((step: any) => ({
    instruction: step.maneuver.type === 'depart'
      ? `Head ${step.maneuver.modifier || 'forward'} on ${step.name || 'the path'}`
      : step.maneuver.type === 'arrive'
        ? 'You have arrived at your destination'
        : `${capitalize(step.maneuver.type)}${step.maneuver.modifier ? ' ' + step.maneuver.modifier : ''} onto ${step.name || 'the path'}`,
    distance: step.distance,
    duration: step.duration,
    maneuver: step.maneuver.type,
    modifier: step.maneuver.modifier || null,
    // The endpoint of this step (last coord of step geometry)
    endLocation: {
      lat: step.geometry.coordinates[step.geometry.coordinates.length - 1][1],
      lng: step.geometry.coordinates[step.geometry.coordinates.length - 1][0],
    },
  }));

  return {
    steps,
    totalDistance: route.distance,
    totalDuration: route.duration,
    geometry: route.geometry, // GeoJSON LineString
  };
}

// Search nearby places using Nominatim/Overpass
async function searchNearby(lat: number, lng: number, type: string) {
  // Map common types to Overpass amenity tags
  const typeMap: Record<string, string> = {
    hospital: 'hospital', medical: 'pharmacy', pharmacy: 'pharmacy',
    clinic: 'clinic', doctor: 'doctors', restaurant: 'restaurant',
    atm: 'atm', bank: 'bank', cafe: 'cafe', store: 'convenience',
  };
  const key = Object.keys(typeMap).find(k => type.toLowerCase().includes(k)) || 'hospital';
  const amenity = typeMap[key];

  const overpassQuery = `[out:json];node["amenity"="${amenity}"](around:2000,${lat},${lng});out 1;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.elements && data.elements.length > 0) {
    const place = data.elements[0];
    return {
      name: place.tags?.name || `Nearby ${key}`,
      lat: place.lat,
      lon: place.lon,
    };
  }

  return null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RouteRequest & { action?: string; type?: string } = await req.json();
    const { action } = body;

    if (action === 'nearby') {
      const result = await searchNearby(body.originLat, body.originLng, body.type || 'hospital');
      if (!result) {
        return new Response(JSON.stringify({ error: 'No nearby places found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: route calculation
    let destLat = body.destLat;
    let destLng = body.destLng;
    let destName = body.destQuery || 'destination';

    if (!destLat || !destLng) {
      if (!body.destQuery) {
        return new Response(JSON.stringify({ error: 'Destination required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const geo = await geocode(body.destQuery);
      if (!geo) {
        return new Response(JSON.stringify({ error: 'Could not find destination' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      destLat = geo.lat;
      destLng = geo.lon;
      destName = geo.displayName;
    }

    const route = await getRoute(body.originLat, body.originLng, destLat, destLng);
    if (!route) {
      return new Response(JSON.stringify({ error: 'Could not calculate route' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ...route,
      destination: destName,
      destLat,
      destLng,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
