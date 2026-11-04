'use server';

import { createNiaResponse, type NiaInputItem } from '@neup/logica/intelligence/responses';
import { prisma } from '@neup/core/database/prisma';
import { getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { getRequirementByUserId } from '@/services/requirements/get';
import type { ListingFilters, Requirement } from '@/types';
import { z } from 'zod';

const PROPERTY_SEARCH_SYSTEM_PROMPT = `Convert the user's natural-language property search query into a valid JSON object. Return only keys explicitly mentioned or clearly identifiable in the query. Never include unspecified keys, null values, or empty objects. Do not invent or assume values. For exact counts, return only the corresponding field. For ranges, return only explicitly specified fields (for example, at least 2 bedrooms means {"minBedroom":2}). Interpret compact notation field(value,min,max), mapping value to field, min to minField, and max to maxField. Allowed fields: listed_by (owner/agency/agent/developer), price (integer), minPrice (integer), maxPrice (integer), currency (string), purpose (rent/buy), category (house/apartment/bungalow/land), nature (commercial/residential/semi-commercial), bedroom, minBedroom, maxBedroom, bathroom, minBathroom, maxBathroom, kitchen, minKitchen, maxKitchen, diningRoom, minDiningRoom, maxDiningRoom, livingRoom, minLivingRoom, maxLivingRoom, bikeParkingSpot, minBikeParkingSpot, maxBikeParkingSpot, carParkingSpot, minCarParkingSpot, maxCarParkingSpot, location (string), tags (string array). Do not return location subfields. Omit tags unless explicitly mentioned; if tags are explicitly requested without naming any, return an empty array. Use integer numbers. Return only RFC 8259 JSON with double-quoted keys and string values, without Markdown or explanation.`;

const PROPERTY_SEARCH_OUTPUT_PROMPT = `Output must be valid RFC 8259 JSON. Every object key and string value must use double quotes. Do not URL-encode or HTML-encode JSON. Do not include Markdown code blocks, explanations, or comments. Validate the JSON before returning it. Example: {"location":"Kathmandu","category":"house"}.`;

const NiaListingSearchResultSchema = z.object({
  listed_by: z.enum(['owner', 'agency', 'agent', 'developer']).optional(),
  price: z.number().int().nonnegative().optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  purpose: z.enum(['rent', 'buy']).optional(),
  category: z.enum(['house', 'apartment', 'bungalow', 'land']).optional(),
  nature: z.enum(['commercial', 'residential', 'semi-commercial']).optional(),
  bedroom: z.number().int().nonnegative().optional(),
  minBedroom: z.number().int().nonnegative().optional(),
  maxBedroom: z.number().int().nonnegative().optional(),
  bathroom: z.number().int().nonnegative().optional(),
  minBathroom: z.number().int().nonnegative().optional(),
  maxBathroom: z.number().int().nonnegative().optional(),
  kitchen: z.number().int().nonnegative().optional(),
  minKitchen: z.number().int().nonnegative().optional(),
  maxKitchen: z.number().int().nonnegative().optional(),
  diningRoom: z.number().int().nonnegative().optional(),
  minDiningRoom: z.number().int().nonnegative().optional(),
  maxDiningRoom: z.number().int().nonnegative().optional(),
  livingRoom: z.number().int().nonnegative().optional(),
  minLivingRoom: z.number().int().nonnegative().optional(),
  maxLivingRoom: z.number().int().nonnegative().optional(),
  bikeParkingSpot: z.number().int().nonnegative().optional(),
  minBikeParkingSpot: z.number().int().nonnegative().optional(),
  maxBikeParkingSpot: z.number().int().nonnegative().optional(),
  carParkingSpot: z.number().int().nonnegative().optional(),
  minCarParkingSpot: z.number().int().nonnegative().optional(),
  maxCarParkingSpot: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).strip();

type NiaListingSearchResult = z.infer<typeof NiaListingSearchResultSchema>;

// Normalize the natural-language term used to look up a saved AI response.
function buildNaturalSearchTitle(query: string): string {
  return query.trim();
}

// Read and validate a cached structured response for the exact normalized query.
async function getCachedNaturalSearch(title: string): Promise<NiaListingSearchResult | null> {
  const cachedSearch = await prisma.naturalSearch.findUnique({ where: { title } });
  if (!cachedSearch || !cachedSearch.value || typeof cachedSearch.value !== 'object') return null;

  const parsedResult = NiaListingSearchResultSchema.safeParse(cachedSearch.value);
  return parsedResult.success ? parsedResult.data : null;
}

// Persist Nia's validated structured response for future reuse of the same query.
async function saveNaturalSearch(title: string, result: NiaListingSearchResult): Promise<void> {
  await prisma.naturalSearch.upsert({
    where: { title },
    create: { title, value: result as unknown as object },
    update: { value: result as unknown as object },
  });
}

// Keep only preference fields relevant to interpreting the current query.
function formatRequirements(requirements: Requirement[]): string {
  return JSON.stringify(requirements.map((requirement, index) => ({
    requirement: index + 1,
    purpose: requirement.purpose,
    propertyType: requirement.propertyType,
    minBudget: requirement.minBudget,
    maxBudget: requirement.maxBudget,
    location: requirement.location,
    requiredTime: requirement.requiredTime,
    urgency: requirement.urgency,
  })));
}

// Build the prompt sequence using only the user's saved requirement context.
function buildListingSearchInput(query: string, requirements: Requirement[]): NiaInputItem[] {
  return [
    { type: 'text', role: 'developer', text: PROPERTY_SEARCH_SYSTEM_PROMPT },
    { type: 'text', role: 'developer', text: PROPERTY_SEARCH_OUTPUT_PROMPT },
    { type: 'text', role: 'developer', text: `User's saved requirements: ${formatRequirements(requirements)}` },
    { type: 'text', role: 'user', text: query },
  ];
}

// Convert Nia's documented search vocabulary to the application's property filter fields.
function mapNiaSearchResult(result: NiaListingSearchResult): ListingFilters {
  const filters: Record<string, unknown> = {};
  if (result.listed_by === 'owner') filters.listingBy = ['owners'];
  if (result.listed_by === 'developer') filters.listingBy = ['developers'];
  if (result.listed_by === 'agency') filters.listingBy = ['agencies'];
  if (result.price !== undefined) {
    filters.minPrice = result.price;
    filters.maxPrice = result.price;
  }
  if (result.minPrice !== undefined) filters.minPrice = result.minPrice;
  if (result.maxPrice !== undefined) filters.maxPrice = result.maxPrice;
  if (result.purpose) filters.purpose = [result.purpose === 'buy' ? 'Sale' : 'Rent'];
  if (result.category) {
    const category = result.category === 'bungalow' ? 'Bungalow' : result.category[0].toUpperCase() + result.category.slice(1);
    filters.category = [category];
  }
  if (result.nature) {
    const nature = result.nature === 'semi-commercial' ? 'Semi-Commercial' : result.nature[0].toUpperCase() + result.nature.slice(1);
    filters.type = [nature];
  }
  if (result.location) filters.location = result.location;
  if (result.tags?.length) filters.tags = result.tags;

  const roomMappings = [
    ['bedroom', 'bedrooms', 'minBedroom', 'minBedrooms', 'maxBedroom', 'maxBedrooms'],
    ['bathroom', 'bathrooms', 'minBathroom', 'minBathrooms', 'maxBathroom', 'maxBathrooms'],
    ['kitchen', 'kitchens', 'minKitchen', 'minKitchens', 'maxKitchen', 'maxKitchens'],
    ['diningRoom', 'diningRooms', 'minDiningRoom', 'minDiningRooms', 'maxDiningRoom', 'maxDiningRooms'],
    ['livingRoom', 'livingRooms', 'minLivingRoom', 'minLivingRooms', 'maxLivingRoom', 'maxLivingRooms'],
    ['bikeParkingSpot', 'bikeParkingSpots', 'minBikeParkingSpot', 'minBikeParkingSpots', 'maxBikeParkingSpot', 'maxBikeParkingSpots'],
    ['carParkingSpot', 'carParkingSpots', 'minCarParkingSpot', 'minCarParkingSpots', 'maxCarParkingSpot', 'maxCarParkingSpots'],
  ] as const;

  for (const [source, target, minSource, minTarget, maxSource, maxTarget] of roomMappings) {
    if (result[source] !== undefined) filters[target] = result[source];
    if (result[minSource] !== undefined) filters[minTarget] = result[minSource];
    if (result[maxSource] !== undefined) filters[maxTarget] = result[maxSource];
  }

  return filters as ListingFilters;
}

// Parse plain, quoted, or fenced JSON returned inside Nia's text value.
function parseNiaSearchJson(outputText: string): NiaListingSearchResult {
  const normalizedText = outputText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsedValue: unknown = JSON.parse(normalizedText);

  if (typeof parsedValue === 'string') {
    parsedValue = JSON.parse(parsedValue);
  }

  return NiaListingSearchResultSchema.parse(parsedValue);
}

// Ask Nia to parse a property query with the current account's saved requirements as context.
export async function parseListingSearchQuery(query: string): Promise<ListingFilters> {
  const title = buildNaturalSearchTitle(query);
  const cachedResult = await getCachedNaturalSearch(title);
  if (cachedResult) return mapNiaSearchResult(cachedResult);

  const accountId = await getAccountIdFromJWT();
  const requirements = accountId ? (await getRequirementByUserId(accountId)) ?? [] : [];
  const response = await createNiaResponse({
    model: 'auto',
    failover: true,
    stream: false,
    input: buildListingSearchInput(query, requirements),
  });
  const outputText = response.data.output
    .filter((item) => item.type === 'text')
    .map((item) => item.value)
    .join('\n')
    .trim();
  if (!outputText) {
    throw new Error('Nia returned no JSON property filters.');
  }

  const parsedJson = parseNiaSearchJson(outputText);
  await saveNaturalSearch(title, parsedJson);
  const propertyFilters = mapNiaSearchResult(parsedJson);
  console.dir({ niaSearchJson: parsedJson, propertyFilters }, {
    depth: null,
    maxArrayLength: null,
    maxStringLength: null,
    compact: false,
  });
  return propertyFilters;
}
