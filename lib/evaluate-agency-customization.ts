/**
 * evaluate-agency-customization.ts
 *
 * Given an AgencyCustomizationRule and a flat form-values object, returns a
 * map of { fieldPath → errorMessage } for every required field that is empty
 * or missing.
 *
 * "Empty" means: undefined | null | "" | [] | {} with no non-empty values.
 */

import type { AgencyCustomizationRule } from '@/types';

/** Human-readable labels for known field paths */
const FIELD_LABELS: Record<string, string> = {
  // Basic
  title:                    'Title',
  description:              'Description',
  purposes:                 'Purpose',
  'categories':             'Property type',
  'types':                  'Property nature',

  // Specifics
  area:                     'Area',
  'area.sqft':              'Area (sqft)',
  facing:                   'House direction',
  'landDetails.facing':     'Land direction',
  floors:                   'Total floors',
  onFloor:                  'Floor number',
  buildStart:               'Build start year',
  buildCompleted:           'Build end year',
  roadAccess:               'Road access',

  // Rooms
  bedrooms:                 'Bedrooms',
  bathrooms:                'Bathrooms',
  kitchens:                 'Kitchens',
  livingRooms:              'Living rooms',
  diningRooms:              'Dining rooms',
  carParkingSpots:          'Car parking spots',
  bikeParkingSpots:         'Bike parking spots',

  // Pricing
  'pricing.listed':         'Listed price',
  'pricing.basis':          'Pricing basis',
  'pricing.currency':       'Currency',
  'pricing.negotiable':     'Negotiable',

  // Location
  'structuredLocation.province':     'Province',
  'structuredLocation.district':     'District',
  'structuredLocation.municipality': 'Municipality',
  'structuredLocation.ward':         'Ward',
  'structuredLocation.street':       'Street',
  'structuredLocation.landmark':     'Landmark',
  'structuredLocation.coordinates':  'Coordinates',

  // Land
  'landDetails.area':       'Land area',
  'landDetails.frontage':   'Land frontage',
  'landDetails.depth':      'Land depth',
  'landDetails.usage':      'Land usage',
  'landDetails.zoning':     'Land zoning',
  'landDetails.topography': 'Land topography',

  // Owners
  owners:                   'Owner information',

  // Media
  images:                   'Property photos',
  documents:                'Property documents',

  // SEO
  metaTitle:                'Meta title',
  metaDescription:          'Meta description',
  metaTags:                 'Meta tags',
  slug:                     'URL slug',

  // Lead fields
  'contact.phone':          'Phone number',
  'contact.email':          'Email address',
  source:                   'Lead source',
  priority:                 'Priority',
  'requirement.location':   'Preferred location',
  'requirement.budget':     'Budget',
};

function labelFor(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/\./g, ' › ').trim();
}

/** Resolve a dot-path like "pricing.listed" against a nested object */
function getByPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur == null || typeof cur !== 'object') return undefined;
    return (cur as Record<string, unknown>)[key];
  }, obj);
}

/** Returns true when a value is considered "empty" for validation purposes */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    // An object is empty if every leaf value is empty
    return Object.values(value as Record<string, unknown>).every(isEmpty);
  }
  if (typeof value === 'number') return isNaN(value);
  return false;
}

export type AgencyFieldErrors = Record<string, string>;

/**
 * Evaluate the agency customization rule against the current form values.
 *
 * @param rule   - The AgencyCustomizationRule fetched for this agency + target
 * @param values - The current form values (flat or nested object)
 * @returns      - A map of { fieldPath → errorMessage } for failing required fields
 */
export function evaluateAgencyCustomization(
  rule: AgencyCustomizationRule,
  values: Record<string, any>,
): AgencyFieldErrors {
  const errors: AgencyFieldErrors = {};

  for (const field of rule.required) {
    const value = getByPath(values, field);
    if (isEmpty(value)) {
      errors[field] = `${labelFor(field)} is required by your agency.`;
    }
  }

  return errors;
}

/**
 * Returns a list of human-readable error messages for all failing required fields.
 */
export function getAgencyValidationMessages(
  rule: AgencyCustomizationRule,
  values: Record<string, any>,
): string[] {
  const errors = evaluateAgencyCustomization(rule, values);
  return Object.values(errors);
}
