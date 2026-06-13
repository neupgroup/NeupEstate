

import { z } from 'zod';
import { PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema } from './property';

export interface Sitemap {
  id: string;
  url: string;
  lastChecked?: string;
}

export type SitemapLog = {
    status: 'info' | 'success' | 'skipped' | 'error';
    message: string;
    propertyId?: string;
    rawHtml?: string;
    updatedData?: any; // Using 'any' to avoid circular dependencies with AI types
};

export const PropertyFiltersSchema = z.object({
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
  searchTerm: z.string().optional(),
  status: z.enum(['approved', 'pending']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  location: z.string().optional(),
  purpose: z.array(PropertyPurposeSchema).optional(),
  category: z.array(PropertyCategorySchema).optional(),
  type: z.array(PropertyUsageTypeSchema).optional(),
  minArea: z.coerce.number().optional(),
  maxArea: z.coerce.number().optional(),
  agencyName: z.string().optional(),
  listingAgent: z.string().optional(),
  isOwnerListing: z.boolean().optional(),
  postedAfter: z.string().datetime({ message: "Invalid datetime format for postedAfter." }).optional().describe('Date in ISO 8601 format'),
  postedBefore: z.string().datetime({ message: "Invalid datetime format for postedBefore." }).optional().describe('Date in ISO 8601 format'),
  minFloors: z.coerce.number().optional(),
  maxFloors: z.coerce.number().optional(),
  minRoadAccess: z.coerce.number().optional(),
  maxRoadAccess: z.coerce.number().optional(),
  bedrooms: z.coerce.number().optional(),
  sourceUrl: z.string().optional(),
  listingBy: z.array(z.enum(['owners', 'developers', 'agencies'])).optional(),
  kitchens: z.coerce.number().optional(),
  diningRooms: z.coerce.number().optional(),
  livingRooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  carParkingSpots: z.coerce.number().optional(),
  bikeParkingSpots: z.coerce.number().optional(),
  tags: z.array(z.string()).optional(),
  // Fields for "or more" / "or less" filters
  minBedrooms: z.coerce.number().optional(),
  maxBedrooms: z.coerce.number().optional(),
  minBathrooms: z.coerce.number().optional(),
  maxBathrooms: z.coerce.number().optional(),
  minKitchens: z.coerce.number().optional(),
  maxKitchens: z.coerce.number().optional(),
  minDiningRooms: z.coerce.number().optional(),
  maxDiningRooms: z.coerce.number().optional(),
  minLivingRooms: z.coerce.number().optional(),
  maxLivingRooms: z.coerce.number().optional(),
  minCarParkingSpots: z.coerce.number().optional(),
  maxCarParkingSpots: z.coerce.number().optional(),
  minBikeParkingSpots: z.coerce.number().optional(),
  maxBikeParkingSpots: z.coerce.number().optional(),
});
export type PropertyFilters = z.infer<typeof PropertyFiltersSchema>;

export interface Problem {
  id: string;
  context: string;
  message: string;
  stack?: string;
  createdAt: string; // ISO 8601 date string
  details?: Record<string, any>;
}

export interface UserActivity {
  id: string;
  userId: string;
  activity: string; // e.g., 'page_view', 'save_property'
  page?: string; // The path of the page viewed
  propertyId?: string; // If the activity is related to a property
  activityOn: string; // ISO 8601 date string
  duration?: number; // Optional duration in seconds, for 'page_view'
}
export type CreateUserActivityInput = Omit<UserActivity, 'id'>;
