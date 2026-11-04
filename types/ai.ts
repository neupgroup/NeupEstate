

import { z } from 'zod';
import { ListingPurposeSchema, ListingCategorySchema, ListingUsageTypeSchema, type UserPreferences } from './listing';
import { ListingFiltersSchema } from './admin';

export const ExtractedListingSchema = z.object({
    isListingPage: z.boolean().describe('Set to true if the URL points to a valid property listing page, otherwise false.'),
    title: z.string().optional().describe('The title of the property listing.'),
    description: z.string().optional().describe('A detailed description of the property.'),
    price: z.coerce.number().optional().describe('The price of the property (for sale or rent). If the price is listed as "negotiable", "on-call", or is not present, **you must omit the \'price\' field from the output**. The value must be a number, without currency symbols.'),
    location: z.string().optional().describe('The address or general location of the property.'),
    bedrooms: z.coerce.number().optional().describe('The number of bedrooms.'),
    bathrooms: z.coerce.number().optional().describe('The number of bathrooms.'),
    area: z.coerce.number().optional().describe('The total area in square feet.'),
    purpose: ListingPurposeSchema.optional().describe("The listing's purpose. Must be one of 'Sale', 'Rent', 'Lease'."),
    category: ListingCategorySchema.optional().describe("The property category. Must be one of 'House', 'Apartment', 'Land', 'Flat'."),
    type: ListingUsageTypeSchema.optional().describe("The property usage type. Must be one of 'Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant', 'Semi-Commercial'."),
    amenities: z.array(z.string()).optional().describe('A list of key amenities.'),
    images: z.array(z.string()).optional().describe('A list of image URLs from the page. These must be full, absolute URLs. If you find relative URLs (e.g., /uploads/image.jpg), you must convert them to absolute URLs based on the source URL.'),
    listingAgent: z.string().optional().describe("The name of the listing agent, if available. Omit this field entirely if no agent is found."),
    isOwnerListing: z.boolean().optional().describe("Set to true if the listing is posted directly by the owner."),
    floors: z.coerce.number().optional().describe('The number of floors in the building.'),
    roadAccess: z.coerce.number().optional().describe('The width of the road access in feet.'),
    sourceUrl: z.string().optional(),
});
export type ExtractedListingData = z.infer<typeof ExtractedListingSchema>;

export const RecommendedListingSchema = z.object({
  propertyId: z.string().describe('The unique identifier of the property.'),
  location: z.string().describe('The location of the property.'),
  price: z.number().describe('The price of the property.'),
  propertyType: z.string().describe('The type of the property (e.g., house, apartment).'),
  bedrooms: z.number().describe('The number of bedrooms in the property.'),
  bathrooms: z.number().describe('The number of bathrooms in the property.'),
  squareFootage: z.number().describe('The square footage of the property.'),
  description: z.string().describe('A short description of the property.'),
  imageUrl: z.string().describe('URL of an image of the property. Must be a placeholder from https://placehold.co, for example: https://placehold.co/600x400.png.'),
});
export type RecommendedListing = z.infer<typeof RecommendedListingSchema>;

// New Recommendation System Types
export const RecommendListingsInputSchema = z.custom<UserPreferences>();
export type RecommendListingsInput = z.infer<typeof RecommendListingsInputSchema>;

export const RecommendListingsOutputSchema = z.object({
    filters: z.array(ListingFiltersSchema).max(3).describe('An array of 1 to 3 targeted search filter objects.'),
});
export type RecommendListingsOutput = z.infer<typeof RecommendListingsOutputSchema>;

const SpaceSchema = z.object({
  bedroom: z.number().optional(),
  bedroomAttached: z.number().optional(),
  kitchenRoom: z.number().optional(),
  diningRoom: z.number().optional(),
  bathroom: z.number().optional(),
  livingRoom: z.number().optional(),
  bikeParking: z.number().optional(),
  carParking: z.number().optional()
}).optional();

export const NaturalLanguageSearchOutputSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  listingPurpose: z.enum(["sale", "rent", "lease"]).optional(),
  category: z.enum(["house", "apartment", "land", "flat"]).optional(),
  usageType: z.enum(["residential", "commercial", "industrial", "agricultural", "semiCommercial"]).optional(),
  space: SpaceSchema,
  tags: z.array(z.string()).optional(),
  location: z.string().optional(),
  propertyBy: z.string().optional(),
  body: z.string().optional()
});
export type NaturalLanguageSearchOutput = z.infer<typeof NaturalLanguageSearchOutputSchema>;

export const ListingApprovalResultSchema = z.object({
  approved: z.boolean(),
  reason: z.string(),
});
export type ListingApprovalResult = z.infer<typeof ListingApprovalResultSchema>;

export const ListingAmendmentResultSchema = z.object({
  amended: z.boolean(),
  reason: z.string(),
});
export type ListingAmendmentResult = z.infer<typeof ListingAmendmentResultSchema>;

export const RewriteListingDetailsInputSchema = z.object({
  title: z.string().describe('The current title of the property listing.'),
  description: z.string().describe('The current description of the property.'),
  location: z.string().describe('The current location/address of the property.'),
  existingSlug: z.string().optional().describe('The current URL slug, if one exists.'),
});
export type RewriteListingDetailsInput = z.infer<typeof RewriteListingDetailsInputSchema>;

export const RewriteListingDetailsOutputSchema = z.object({
  rewrittenTitle: z.string().describe('The rewritten, engaging title.'),
  rewrittenDescription: z.string().describe('The rewritten, professional, and appealing description.'),
  rewrittenLocation: z.string().describe('The standardized location (e.g., City, State/Country).'),
  rewrittenMetaTitle: z.string().max(60).describe('An SEO-optimized meta title, under 60 characters, based on property details and location.'),
  rewrittenMetaDescription: z.string().max(160).describe('An SEO-optimized meta description, under 160 characters, summarizing the property.'),
  rewrittenMetaTags: z.array(z.string()).describe('A list of relevant SEO keywords/tags based on the property details.'),
  generatedSlug: z.string().optional().describe('A URL-friendly slug (kebab-case) generated from the title and location. This is only generated if no existing slug was provided.'),
  finalSlug: z.string().optional().describe('The final slug to be saved to the database.'),
});
export type RewriteListingDetailsOutput = z.infer<typeof RewriteListingDetailsOutputSchema>;

export const ListingAssuranceResultSchema = z.object({
  assured: z.boolean(),
  reason: z.string(),
  steps: z.array(z.string()),
});
export type ListingAssuranceResult = z.infer<typeof ListingAssuranceResultSchema>;

export const ListingImageUpdateResultSchema = z.object({
  updated: z.boolean(),
  reason: z.string(),
  imageCount: z.number().optional(),
});
export type ListingImageUpdateResult = z.infer<typeof ListingImageUpdateResultSchema>;

// New type for the unified text generation service
export const GenerateTextOutputSchema = z.object({
    text: z.string(),
});
