/*
::neup.documentation::property-map

Renders a Leaflet property map using saved coordinates when available or a
fallback geocoding search from street/tole to municipality to district.

::end
*/
"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";

const LEAFLET_STYLESHEET_ID = "leaflet-stylesheet";
const LEAFLET_STYLESHEET_HREF = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

type MapCenter = {
  lat: number;
  lng: number;
};

type SearchTarget = {
  query: string;
  zoom: number;
};

interface PropertyMapProps {
  center?: MapCenter | null;
  searchTargets?: SearchTarget[];
  approximate?: boolean;
}

type SearchResult = {
  displayName: string;
  lat: number;
  lng: number;
  zoom: number;
  geojson?: GeoJSON.GeoJsonObject;
};

type NominatimResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
  geojson?: GeoJSON.GeoJsonObject;
};

function ensureLeafletStylesheet() {
  if (document.getElementById(LEAFLET_STYLESHEET_ID)) {
    return;
  }

  const link = document.createElement("link");
  link.id = LEAFLET_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href = LEAFLET_STYLESHEET_HREF;
  document.head.appendChild(link);
}

function getUniqueSearchTargets(searchTargets: SearchTarget[] | undefined): SearchTarget[] {
  if (!searchTargets) {
    return [];
  }

  const seen = new Set<string>();

  return searchTargets.filter((target) => {
    const normalizedQuery = target.query.trim();
    if (!normalizedQuery) {
      return false;
    }

    const key = normalizedQuery.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createHighlightMarker(lat: number, lng: number) {
  return L.circleMarker([lat, lng], {
    radius: 10,
    color: "#0f766e",
    weight: 2,
    fillColor: "#14b8a6",
    fillOpacity: 0.35,
  });
}

function createExactLocationMarker(lat: number, lng: number) {
  return L.marker([lat, lng], {
    icon: L.divIcon({
      className: "property-map-exact-marker",
      html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(37,99,235,0.25);"></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    }),
  });
}

async function findLocation(searchTarget: SearchTarget, signal: AbortSignal): Promise<SearchResult | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&polygon_geojson=1&q=${encodeURIComponent(searchTarget.query)}`,
    {
      headers: {
        "Accept-Language": "en",
      },
      signal,
    }
  );

  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as NominatimResult[];
  const firstResult = results[0];

  if (!firstResult?.lat || !firstResult?.lon) {
    return null;
  }

  const lat = Number(firstResult.lat);
  const lng = Number(firstResult.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    displayName: firstResult.display_name || searchTarget.query,
    lat,
    lng,
    zoom: searchTarget.zoom,
    geojson: firstResult.geojson,
  };
}

export function PropertyMap({ center, searchTargets, approximate = false }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | L.Marker | null>(null);
  const polygonRef = useRef<L.GeoJSON | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasResolvedLocation, setHasResolvedLocation] = useState(false);

  useEffect(() => {
    ensureLeafletStylesheet();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      polygonRef.current?.remove();
      polygonRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const resolvedTargets = getUniqueSearchTargets(searchTargets);

    const placeMarker = (
      lat: number,
      lng: number,
      zoom: number,
      label?: string,
      geojson?: GeoJSON.GeoJsonObject,
      exact = false
    ) => {
      markerRef.current?.remove();
      polygonRef.current?.remove();
      polygonRef.current = null;

      markerRef.current = exact
        ? createExactLocationMarker(lat, lng).addTo(map)
        : createHighlightMarker(lat, lng).addTo(map);

      if (label) {
        markerRef.current.bindPopup(label);
      }

      if (geojson) {
        polygonRef.current = L.geoJSON(geojson, {
          style: {
            color: "#0f766e",
            weight: 2,
            fillColor: "#14b8a6",
            fillOpacity: 0.18,
          },
        }).addTo(map);

        const bounds = polygonRef.current.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [24, 24], maxZoom: zoom });
        } else {
          map.setView([lat, lng], zoom);
        }
      } else {
        map.setView([lat, lng], zoom);
      }

      setHasResolvedLocation(true);
    };

    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      placeMarker(center.lat, center.lng, 16, undefined, undefined, !approximate);
      return;
    }

    if (resolvedTargets.length === 0) {
      setHasResolvedLocation(false);
      map.setView([28.3949, 84.124], 7);
      return;
    }

    const abortController = new AbortController();
    let isCancelled = false;

    const resolveLocation = async () => {
      setHasResolvedLocation(false);

      for (const searchTarget of resolvedTargets) {
        const result = await findLocation(searchTarget, abortController.signal);
        if (!result || isCancelled) {
          continue;
        }

        placeMarker(result.lat, result.lng, result.zoom, result.displayName, result.geojson);
        return;
      }

      if (!isCancelled) {
        markerRef.current?.remove();
        markerRef.current = null;
        polygonRef.current?.remove();
        polygonRef.current = null;
        map.setView([28.3949, 84.124], 7);
        setHasResolvedLocation(false);
      }
    };

    void resolveLocation();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [center, searchTargets]);

  return (
    <>
      <div className="relative overflow-hidden rounded-lg border">
        {!isMapReady && <Skeleton className="absolute inset-0 h-[400px] w-full" />}
        <div ref={containerRef} className="h-[400px] w-full bg-muted" />
        {isMapReady && !hasResolvedLocation ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
            Showing the default map view until a district, municipality, or street/tole match is found.
          </div>
        ) : null}
      </div>
      {approximate ? <p className="mt-2 text-sm text-muted-foreground">This is not an exact location.</p> : null}
    </>
  );
}
