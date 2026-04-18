'use client';

import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

interface PropertyMapProps {
  center: {
    lat: number;
    lng: number;
  };
}

export function PropertyMap({ center }: PropertyMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    language: 'en',
  });

  if (loadError || !apiKey) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Map Error</AlertTitle>
        <AlertDescription>
            Could not load Google Maps. Please ensure the API key is configured correctly.
        </AlertDescription>
      </Alert>
    );
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
    >
      <MarkerF position={center} />
    </GoogleMap>
  ) : (
    <Skeleton className="h-[400px] w-full" />
  );
}
