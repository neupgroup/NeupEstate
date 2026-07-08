/*
::neup.documentation::property-location-service

Builds the public map payload for a property, honoring the show-map flag and
choosing between exact geolocation and approximate searchable location data.

::end
*/
import type { Property } from '@/types';

export type PropertyMapSearchTarget = {
  query: string;
  zoom: number;
};

export type PropertyMapLocation =
  | {
      mode: 'exact';
      center: {
        lat: number;
        lng: number;
      };
      approximate: false;
      searchTargets: PropertyMapSearchTarget[];
    }
  | {
      mode: 'approximate';
      center: null;
      approximate: true;
      searchTargets: PropertyMapSearchTarget[];
    };

function checkIfShowLocationIsOn(property: Property): boolean {
  return property.details?.showMap !== false;
}

function checkIfGeoLocationExists(property: Property): property is Property & { latitude: number; longitude: number } {
  return typeof property.latitude === 'number'
    && Number.isFinite(property.latitude)
    && typeof property.longitude === 'number'
    && Number.isFinite(property.longitude);
}

function buildSearchTargets(property: Property): PropertyMapSearchTarget[] {
  const streetToleQuery = [
    property.structuredLocation?.street,
    property.structuredLocation?.ward != null ? `Ward ${property.structuredLocation.ward}` : null,
    property.structuredLocation?.municipality,
    property.structuredLocation?.district,
    property.structuredLocation?.province,
    property.structuredLocation?.country,
  ].filter(Boolean).join(', ');

  const municipalityQuery = [
    property.structuredLocation?.municipality,
    property.structuredLocation?.ward != null ? `Ward ${property.structuredLocation.ward}` : null,
    property.structuredLocation?.district,
    property.structuredLocation?.province,
    property.structuredLocation?.country,
  ].filter(Boolean).join(', ');

  const districtQuery = [
    property.structuredLocation?.district,
    property.structuredLocation?.province,
    property.structuredLocation?.country,
  ].filter(Boolean).join(', ');

  return [
    { query: streetToleQuery, zoom: 16 },
    { query: municipalityQuery, zoom: 13 },
    { query: districtQuery, zoom: 10 },
    { query: property.location || '', zoom: 13 },
  ].filter((target) => target.query.trim().length > 0);
}

export function getLocation(property: Property): PropertyMapLocation | null {
  if (!checkIfShowLocationIsOn(property)) {
    return null;
  }

  const searchTargets = buildSearchTargets(property);

  if (checkIfGeoLocationExists(property)) {
    return {
      mode: 'exact',
      center: {
        lat: property.latitude,
        lng: property.longitude,
      },
      approximate: false,
      searchTargets,
    };
  }

  if (searchTargets.length === 0) {
    return null;
  }

  return {
    mode: 'approximate',
    center: null,
    approximate: true,
    searchTargets,
  };
}
