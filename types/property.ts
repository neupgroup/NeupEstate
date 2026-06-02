

import {z} from 'zod';
import type {Agency, User} from './personnel';
import type {ExtractedPropertyData} from './ai';

const allowedImageHosts = ['placehold.co', 'lalpurjanepal.com.np'];

function isValidImageUrl(url: string): boolean {
    if (!url) return true; // Allow empty strings, they will be filtered out later
    try {
        const hostname = new URL(url).hostname;
        // Check for exact match or if it's a subdomain of neupgroup.com
        return allowedImageHosts.includes(hostname) || hostname === 'neupgroup.com' || hostname.endsWith('.neupgroup.com');
    } catch (e) {
        return false; // Invalid URL format
    }
}


// Base Enums
export const PropertyPurposeOptions = ['Sale', 'Rent', 'Lease', 'Exchange'] as const;
export const PropertyPurposeSchema = z.preprocess(
    (val) => {
        if (typeof val === 'string') {
            const lowerVal = val.toLowerCase();
            const capitalizedVal = lowerVal.charAt(0).toUpperCase() + lowerVal.slice(1);
            if (PropertyPurposeOptions.map(o => o.toLowerCase()).includes(lowerVal)) {
                return capitalizedVal;
            }
        }
        return val;
    },
    z.enum(PropertyPurposeOptions)
);
export const PropertyPurposesSchema = z.array(z.enum(PropertyPurposeOptions)).min(1, "Please select at least one purpose.");
export const PropertyCategorySchema = z.enum(['House', 'Bungalow', 'Villa', 'Multiplex', 'Land', 'Apartment', 'Penthouse', 'Commercial Space', 'Shop Space', 'Flat']);
export const PropertyUsageTypeSchema = z.enum(['Residential', 'Semi-Commercial', 'Commercial', 'Industrial', 'Agricultural']);
export const AreaUnitSchema = z.enum(['sqft', 'sqm', 'aana', 'ropani', 'bigha', 'dhur']);
export const LandFacingSchema = z.enum(['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']);

// Area value schema — matches the nested shape written by AreaInput
export const AreaValueSchema = z.object({
    // Aana system
    ropani: z.coerce.number().optional(),
    aana:   z.coerce.number().optional(),
    paisa:  z.coerce.number().optional(),
    daam:   z.coerce.number().optional(),
    // Kattha system
    bigha:  z.coerce.number().optional(),
    kattha: z.coerce.number().optional(),
    dhur:   z.coerce.number().optional(),
    // Metric
    sqft:   z.coerce.number().optional(),
    sqm:    z.coerce.number().optional(),
}).optional();
export type AreaValue = z.infer<typeof AreaValueSchema>;

/** Convert an AreaValue object to a single sqft number for storage */
export function areaValueToSqft(v: AreaValue | number | undefined | null): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    // Conversion factors to sqft
    const ropani = (v.ropani ?? 0) * 5476;
    const aana   = (v.aana   ?? 0) * 342.25;
    const paisa  = (v.paisa  ?? 0) * 85.56;
    const daam   = (v.daam   ?? 0) * 21.39;
    const bigha  = (v.bigha  ?? 0) * 72900;
    const kattha = (v.kattha ?? 0) * 3645;
    const dhur   = (v.dhur   ?? 0) * 182.25;
    const sqft   = (v.sqft   ?? 0);
    const sqm    = (v.sqm    ?? 0) * 10.7639;
    return ropani + aana + paisa + daam + bigha + kattha + dhur + sqft + sqm;
}

// Land Schemas
export const LandUsageSchema = z.enum(['Vacant', 'Developed', 'Under-Construction']);
export const LandZoningSchema = z.enum(['Residential', 'Commercial', 'Industrial', 'Agricultural']);
export const LandTopographySchema = z.enum(['Flat', 'Hilly', 'Sloped']);
export const LandDetailsSchema = z.object({
    area: AreaValueSchema,
    areaUnit: AreaUnitSchema.optional(),
    frontage: z.coerce.number({invalid_type_error: "Frontage must be a number"}).optional(),
    depth: z.coerce.number({invalid_type_error: "Depth must be a number"}).optional(),
    facing: LandFacingSchema.optional(),
    usage: LandUsageSchema.optional(),
    zoning: LandZoningSchema.optional(),
    topography: LandTopographySchema.optional(),
});
export type LandDetails = z.infer<typeof LandDetailsSchema>;
export const PlotDetailsSchema = z.object({
    id: z.string().min(1, "Plot ID is required."),
    area: AreaValueSchema,
    areaUnit: AreaUnitSchema.optional(),
    frontage: z.coerce.number({invalid_type_error: "Frontage must be a number"}).optional(),
    depth: z.coerce.number({invalid_type_error: "Depth must be a number"}).optional(),
    zoning: LandZoningSchema.optional(),
    topography: LandTopographySchema.optional(),
});
export type PlotDetails = z.infer<typeof PlotDetailsSchema>;

// Apartment Schemas
export const FurnishingStatusSchema = z.enum(['Furnished', 'Semi-Furnished', 'Unfurnished']);
export const ApartmentDetailsSchema = z.object({
    furnishing: FurnishingStatusSchema.optional(),
    onFloor: z.coerce.number().optional(),
});
export type ApartmentDetails = z.infer<typeof ApartmentDetailsSchema>;
export const ApartmentUnitSchema = z.object({
    id: z.string().min(1, "Unit ID is required."),
    area: AreaValueSchema,
    areaUnit: AreaUnitSchema.optional(),
    onFloor: z.coerce.number().optional(),
    furnishing: FurnishingStatusSchema.optional(),
    bedrooms: z.coerce.number().optional(),
    bathrooms: z.coerce.number().optional(),
    kitchens: z.coerce.number().optional(),
    diningRooms: z.coerce.number().optional(),
});
export type ApartmentUnit = z.infer<typeof ApartmentUnitSchema>;

// Detailed Schemas (Location, Pricing, etc.)
export const CurrencySchema = z.enum(['NPR', 'USD', 'INR']);
export const DistanceUnitSchema = z.enum(['km', 'miles', 'meters', 'feet', 'yards']);
export const RoadTypeSchema = z.enum(['Blacktop', 'Gravel', 'Dirt']);
export const RoadConditionSchema = z.enum(['Good', 'Fair', 'Poor']);
export const RoadAccessibilitySchema = z.enum(['All-Weather', 'Seasonal', 'Unpaved']);
export const PricingBasisSchema = z.enum([
    'house-rent',
    'land-sale-unit',
    'land-rent-unit',
    'land-rent-flat',
    'apartment-rent',
    'house-sale-flat',
    'house-rent-monthly',
    'house-rent-annual',
    'land-sale-per-aana',
    'land-sale-per-ropani',
    'land-sale-per-sqft',
    'land-sale-flat',
    'land-rent-monthly-per-aana',
    'land-rent-monthly-per-ropani',
    'land-rent-monthly-per-sqft',
    'land-rent-monthly-flat',
    'land-rent-annual-flat',
    'apartment-sale-flat',
    'apartment-rent-monthly',
    'apartment-rent-annual',
    'flat-price',
    'per-month',
    'per-annum',
    'per-aana',
    'per-ropani',
    'per-sqft',
    'per-month-flat',
    'per-annum-flat',
    'per-month-per-aana',
    'per-month-per-ropani',
    'per-month-per-sqft',
    'one-time-total(house/apartment)',
    'per-unit-once(land)',
    'per-unit-timely(rental)',
    'per-unit-once-range(apartments)',
]);
export const PricingOptionsSchema = z.enum(['cash', 'loan', 'mortgage', 'instalment']);
export const EarningsTypeSchema = z.enum(['rental', 'income']);

// Preprocessors for empty strings in forms
const emptyStringToUndefinedNumber = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().optional()
);
const emptyPriceMapValueToUndefinedNumber = z.preprocess(
    (val) => (val === "" || (typeof val === "number" && Number.isNaN(val)) ? undefined : val),
    z.coerce.number().min(0).optional()
);
const optionalPriceMapSchema = z.preprocess((val) => {
    if (!val || typeof val !== "object" || Array.isArray(val)) return undefined;
    const cleaned = Object.fromEntries(
        Object.entries(val as Record<string, unknown>).filter(([, entry]) =>
            entry !== undefined &&
            entry !== null &&
            entry !== "" &&
            !(typeof entry === "number" && Number.isNaN(entry))
        )
    );
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}, z.record(z.coerce.number().min(0)).optional());
const optionalBooleanMapSchema = z.preprocess((val) => {
    if (!val || typeof val !== "object" || Array.isArray(val)) return undefined;
    const cleaned = Object.fromEntries(
        Object.entries(val as Record<string, unknown>).filter(([, entry]) =>
            entry !== undefined && entry !== null && entry !== ""
        )
    );
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}, z.record(z.boolean()).optional());
const optionalStringMapSchema = z.preprocess((val) => {
    if (!val || typeof val !== "object" || Array.isArray(val)) return undefined;
    const cleaned = Object.fromEntries(
        Object.entries(val as Record<string, unknown>).filter(([, entry]) =>
            entry !== undefined && entry !== null && entry !== ""
        )
    );
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}, z.record(z.string()).optional());
const emptyStringToUndefinedInt = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().optional()
);

export const StructuredLocationSchema = z.object({
    country: z.string().optional(),
    province: z.string().optional(),
    district: z.string().optional(),
    municipality: z.string().optional(),
    ward: emptyStringToUndefinedInt,
    street: z.string().optional(),
    landmark: z.string().optional(),
    coordinates: z.string().optional(),
});
export type StructuredLocation = z.infer<typeof StructuredLocationSchema>;

export const PricingSchema = z.object({
    currency: CurrencySchema.default('USD'),
    priceDisplayMode: z.enum(['show-price', 'price-on-call', 'offer-yours-first']).default('show-price'),
    maximum: emptyStringToUndefinedNumber,
    minimum: emptyStringToUndefinedNumber,
    listed: emptyPriceMapValueToUndefinedNumber,
    negotiable: z.boolean().default(false),
    basis: PricingBasisSchema.optional(),
    basisPrices: optionalPriceMapSchema,
    basisNegotiable: optionalBooleanMapSchema,
    basisNegotiablePrices: optionalPriceMapSchema,
    basisFrequencies: optionalStringMapSchema,
    basisUnits: optionalStringMapSchema,
    options: z.string().optional(), // Comma-separated string from form
});
export type Pricing = z.infer<typeof PricingSchema>;

export const RoadAccessDetailsSchema = z.object({
    type: RoadTypeSchema.optional(),
    widthValue: emptyStringToUndefinedNumber,
    widthUnit: z.enum(['ft', 'm']).default('ft'),
    condition: RoadConditionSchema.optional(),
    distanceToMainRoadValue: emptyStringToUndefinedNumber,
    distanceToMainRoadUnit: DistanceUnitSchema.default('km'),
    accessibility: RoadAccessibilitySchema.optional(),
});
export type RoadAccessDetails = z.infer<typeof RoadAccessDetailsSchema>;

export const DistancingSchema = z.object({
    unit: DistanceUnitSchema.default('km'),
    temple: emptyStringToUndefinedNumber,
    mainRoad: emptyStringToUndefinedNumber,
    airport: emptyStringToUndefinedNumber,
    school: emptyStringToUndefinedNumber,
});
export type Distancing = z.infer<typeof DistancingSchema>;

export const EarningsSchema = z.object({
    type: EarningsTypeSchema.optional(),
    monthly: emptyStringToUndefinedNumber,
    yearly: emptyStringToUndefinedNumber,
    currency: CurrencySchema.default('USD'),
});
export type Earnings = z.infer<typeof EarningsSchema>;

// Document and Owner Schemas
export const PropertyDocumentUrlSchema = z.object({
    value: z.string().url({message: "Please enter a valid URL."}).or(z.literal('')),
});

export const PropertyDocumentSchema = z.object({
    name: z.string().min(1, "Document name is required."),
    urls: z.array(PropertyDocumentUrlSchema),
});
export type PropertyDocument = z.infer<typeof PropertyDocumentSchema>;

const PhoneSchema = z.object({
    value: z.string().optional()
        .refine(phone => phone === undefined || phone === '' || !/[a-zA-Z]/.test(phone), {
            message: "Phone number cannot contain letters.",
        })
        .transform(phone => phone ? phone.replace(/[\s.+-]/g, '') : phone),
});

const RegisteredOwnerSchema = z.object({
    ownerType: z.literal('registered'),
    userId: z.string({required_error: "Please select a registered user."}).min(1, "Please select a user."),
    unregisteredOwnerName: z.string().optional(),
    unregisteredOwnerEmail: z.string().optional(),
    unregisteredOwnerPhones: z.array(PhoneSchema).optional(),
    unregisteredOwnerNotes: z.string().optional(),
});

const UnregisteredOwnerSchema = z.object({
    ownerType: z.literal('unregistered'),
    userId: z.string().optional(),
    unregisteredOwnerName: z.string().min(2, "Owner name is required for unregistered owners."),
    unregisteredOwnerEmail: z.string().email({message: "Please enter a valid email."}).optional().or(z.literal('')),
    unregisteredOwnerPhones: z.array(PhoneSchema).optional(),
    unregisteredOwnerNotes: z.string().optional(),
});

export const OwnerSchema = z.discriminatedUnion("ownerType", [
    RegisteredOwnerSchema,
    UnregisteredOwnerSchema,
]);
export type Owner = z.infer<typeof OwnerSchema>;

// Main Property Interface and Schemas
export interface Property {
    id: string;
    title: string;
    description: string;
    price: number;
    location: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    areaUnit?: z.infer<typeof AreaUnitSchema>;
    facing?: z.infer<typeof LandFacingSchema>;
    buildStart?: number;
    buildCompleted?: number;
    purpose: z.infer<typeof PropertyPurposeSchema>;
    purposes?: z.infer<typeof PropertyPurposesSchema>;
    category: z.infer<typeof PropertyCategorySchema>;
    type: z.infer<typeof PropertyUsageTypeSchema>;
    images: string[];
    amenities: string[];
    agency: Agency;
    listingAgent?: string;
    isOwnerListing?: boolean;
    isFeatured?: boolean;
    isApproved?: boolean;
    status?: 'PENDING' | 'ACTIVE' | 'SOLD' | 'RENTED' | 'ARCHIVED';
    sourceUrl?: string;
    createdAt?: string; // ISO 8601 date string
    updatedAt?: string; // ISO 8601 date string
    embedding?: number[];
    floors?: number;
    onFloor?: number;
    roadAccess?: number; // in feet
    latitude?: number;
    longitude?: number;
    fetchHistory?: { fetchedAt: string; data: ExtractedPropertyData }[];
    imageFetchHistory?: { fetchedAt: string; images: string[] }[];
    kitchens?: number;
    diningRooms?: number;
    livingRooms?: number;
    carParkingSpots?: number;
    bikeParkingSpots?: number;
    slug?: string;
    landDetails?: LandDetails;
    plots?: PlotDetails[];
    apartmentDetails?: ApartmentDetails;
    apartmentUnits?: ApartmentUnit[];
    structuredLocation?: StructuredLocation;
    details?: Record<string, any>;
    pricing?: Pricing & { options?: string[] }; // DB stores array
    roadAccessDetails?: RoadAccessDetails;
    distancing?: Distancing;
    earnings?: Earnings;
    owner?: Owner; // For backward compatibility
    owners?: Owner[];
    documents?: PropertyDocument[];
}

export const CreatePropertySchema = z.object({
    title: z.string().min(3, {message: "Title must be at least 3 characters long."}),
    description: z.string().min(10, {message: "Description must be at least 10 characters long."}),
    purpose: PropertyPurposeSchema.optional(),
    purposes: PropertyPurposesSchema,
    categories: z.array(PropertyCategorySchema).min(1, "Please select at least one property type."),
    types: z.array(PropertyUsageTypeSchema).min(1, "Please select at least one property nature."),

    // Property Details
    area: AreaValueSchema,
    areaUnit: AreaUnitSchema.optional(),
    facing: LandFacingSchema.optional(),
    buildStart: emptyStringToUndefinedInt,
    buildCompleted: emptyStringToUndefinedInt,

    // Room Details
    bedrooms: z.coerce.number().int().min(0),
    bathrooms: z.coerce.number().int().min(0),
    kitchens: emptyStringToUndefinedInt,
    diningRooms: emptyStringToUndefinedInt,
    livingRooms: emptyStringToUndefinedInt,
    carParkingSpots: emptyStringToUndefinedInt,
    bikeParkingSpots: emptyStringToUndefinedInt,

    // Generic Details
    floors: emptyStringToUndefinedInt,
    onFloor: emptyStringToUndefinedInt,
    roadAccess: emptyStringToUndefinedNumber,
    amenities: z.string().optional(), // Raw string from textarea

    // SEO Fields — removed
    // metaTitle, metaDescription, metaTags, slug are no longer part of the form

    // Listing/Agent Details
    listingAgent: z.string().optional(),
    isOwnerListing: z.boolean().optional().default(false),

    // Land Details
    landDetails: LandDetailsSchema.optional(),
    plots: z.array(PlotDetailsSchema).optional(),
    // Apartment Details
    apartmentDetails: ApartmentDetailsSchema.optional(),
    apartmentUnits: z.array(ApartmentUnitSchema).optional(),
    // New Detailed Schemas for Form
    structuredLocation: StructuredLocationSchema.optional(),
    pricing: PricingSchema.optional(),
    roadAccessDetails: RoadAccessDetailsSchema.optional(),
    distancing: DistancingSchema.optional(),
    earnings: EarningsSchema.optional(),
    owners: z.array(OwnerSchema).min(1, 'At least one owner is required.').max(4, 'You can add up to 4 owners.').optional(),
    documents: z.array(PropertyDocumentSchema).optional(),
    images: z.array(z.string().url({message: "Please enter a valid URL."}).or(z.literal(''))).optional()
        .refine(
            (images) => images ? images.every(isValidImageUrl) : true,
            {
                message: "One or more image URLs are from an unauthorized domain. Please use allowed domains like placehold.co, lalpurjanepal.com.np, or neupgroup.com."
            }
        ),
});
export const UpdatePropertySchema = CreatePropertySchema;
export type CreatePropertyFormValues = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyFormValues = CreatePropertyFormValues;

export type CreatePropertyInput =
    Omit<CreatePropertyFormValues, 'amenities' | 'images' | 'pricing' | 'owners' | 'purpose' | 'area' | 'landDetails' | 'plots' | 'apartmentUnits'>
    & {
    purpose: Property['purpose'];
    price: number;
    location: string;
    area: number;
    amenities: string[];
    images: string[];
    metaTags?: string[];
    landDetails?: LandDetails;
    plots?: PlotDetails[];
    apartmentDetails?: ApartmentDetails;
    apartmentUnits?: ApartmentUnit[];
    pricing?: Omit<Pricing, 'options'> & { options?: string[] };
    details?: Record<string, any>;
    owners?: Owner[];
};
export type UpdatePropertyInput = CreatePropertyInput;


// Property Request
export const PropertyRequestStatusSchema = z.enum(['new', 'contacted', 'closed']);

export const CreatePropertyRequestSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  location: z.string().optional(),
  propertyType: PropertyCategorySchema.optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  budget: z.coerce.number().optional(),
  remarks: z.string().optional(),
  submittedBy: z.string().optional(), // Verified accountId from gRPC session
});
export type CreatePropertyRequestFormValues = z.infer<typeof CreatePropertyRequestSchema>;

export interface PropertyRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  propertyType?: z.infer<typeof PropertyCategorySchema>;
  bedrooms?: number;
  bathrooms?: number;
  budget?: number;
  remarks?: string;
  submittedBy?: string; // Verified accountId
  status: z.infer<typeof PropertyRequestStatusSchema>;
  createdAt: string; // ISO string
}

// Sales Request
export const SalesRequestStatusSchema = z.enum(['new', 'contacted', 'closed']);

export const CreateSalesRequestSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(1, "Phone number is required."),
  propertyLocation: z.string().min(5, "Please provide a property location."),
  propertyType: z.string().min(3, "Please specify the property type."),
  remarks: z.string().optional(),
  submittedBy: z.string().optional(), // Verified accountId from gRPC session
});
export type CreateSalesRequestFormValues = z.infer<typeof CreateSalesRequestSchema>;

export interface SalesRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyLocation: string;
  propertyType: string;
  remarks?: string;
  submittedBy?: string; // Verified accountId
  status: z.infer<typeof SalesRequestStatusSchema>;
  createdAt: string; // ISO string
}

// Visit Request
export const VisitRequestStatusSchema = z.enum(['new', 'confirmed', 'completed', 'cancelled']);

export const CreateVisitRequestSchema = z.object({
  propertyId: z.string(),
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  preferred_date: z.string().min(1, "Please select a date."),
  preferred_time: z.string().optional(),
  submittedBy: z.string().optional(), // Verified accountId from gRPC session
});
export type CreateVisitRequestFormValues = z.infer<typeof CreateVisitRequestSchema>;

export interface VisitRequest {
    id: string;
    propertyId: string;
    propertyTitle: string; // Denormalized
    agentId: string; // Denormalized
    agentName: string; // Denormalized
    name: string;
    email: string;
    phone?: string;
    preferred_date: string; // YYYY-MM-DD
    preferred_time?: string; // HH:mm
    submittedBy?: string; // Verified accountId
    status: z.infer<typeof VisitRequestStatusSchema>;
    createdAt: string; // ISO string
}

// User Preferences and Activity Tracking
export type PropertyActivityEvent = {
    type: 'view' | 'save' | 'share' | 'call' | 'inquiry' | 'visit_request' | 'mortgage_request' | 'page_view';
    duration?: number; // in seconds, only for 'page_view'
    page?: string; // The page where the event occurred
};

export interface UserPreferences {
    userId: string;
    updatedAt: string; // ISO String
    preferences: {
        location: { [key: string]: { [key in PropertyActivityEvent['type']]?: number } };
        district: { [key: string]: { [key in PropertyActivityEvent['type']]?: number } };
        budget_range: { [key: string]: { [key in PropertyActivityEvent['type']]?: number } };
        type: { [key: string]: { [key in PropertyActivityEvent['type']]?: number } };
        category: { [key: string]: { [key in PropertyActivityEvent['type']]?: number } };
    };
    totalViews: number;
    totalSaves: number;
    totalInquiries: number;
    totalTimeSpentInSeconds: number;
}
