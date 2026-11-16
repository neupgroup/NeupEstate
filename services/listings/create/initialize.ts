import { prisma } from '@neup/core/database/prisma';
import { resolveListingCreateContext } from '@/services/listings/create/context';
import { firstPositivePrice } from '@/services/listings/action-helpers';

export type ListingCreationInitialization = {
  creationId: string;
  stage: 'initialized' | 'collecting' | 'ready_for_review';
  type: string | null;
  purpose: string | null;
  required: ListingCreationRequirement[];
};

export type ListingCreationRequirement = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
  options?: string[];
};

// Describe the minimum next fields using the same listing vocabulary and enums as the form schema.
export function getListingCreationRequirements(data: Record<string, unknown>): ListingCreationRequirement[] {
  const requirements: ListingCreationRequirement[] = [];
  if (typeof data.purpose !== 'string') {
    requirements.push({ key: 'purpose', type: 'enum', options: ['Sale', 'Rent', 'Lease', 'Exchange'] });
  }
  if (typeof data.category !== 'string') {
    requirements.push({ key: 'type', type: 'enum', options: ['House', 'Bungalow', 'Villa', 'Multiplex', 'Land', 'Apartment', 'Penthouse', 'Commercial Space', 'Shop Space', 'Flat'] });
  }
  if (requirements.length) return requirements;

  requirements.push(
    { key: 'title', type: 'string' },
    { key: 'description', type: 'string' },
    { key: 'types', type: 'array', options: ['Residential', 'Semi-Commercial', 'Commercial', 'Industrial', 'Agricultural'] },
    { key: 'location', type: 'string' },
  );

  const category = String(data.category).toLowerCase();
  if (category === 'house' || category === 'bungalow' || category === 'villa' || category === 'multiplex') {
    requirements.push(
      { key: 'bedrooms', type: 'number' },
      { key: 'bathrooms', type: 'number' },
      { key: 'floors', type: 'number' },
      { key: 'area', type: 'object' },
    );
  } else if (category === 'land') {
    requirements.push({ key: 'landDetails.area', type: 'object' });
  } else if (category === 'apartment' || category === 'flat' || category === 'penthouse') {
    requirements.push(
      { key: 'bedrooms', type: 'number' },
      { key: 'bathrooms', type: 'number' },
      { key: 'apartmentDetails', type: 'object' },
      { key: 'area', type: 'object' },
    );
  }

  if (!data.pricing || typeof data.pricing !== 'object') {
    requirements.push({ key: 'pricing', type: 'object' });
  } else {
    const pricing = data.pricing as Record<string, unknown>;
    if (!pricing.basis) {
      const purpose = String(data.purpose).toLowerCase();
      const category = String(data.category).toLowerCase();
      const options = category === 'land'
        ? purpose === 'rent' || purpose === 'lease'
          ? ['land-rent-unit', 'land-rent-flat', 'land-rent-monthly', 'land-rent-annual-flat']
          : ['land-sale-unit', 'land-sale-flat', 'land-sale-per-aana', 'land-sale-per-ropani', 'land-sale-per-sqft']
        : purpose === 'rent' || purpose === 'lease'
          ? ['house-rent', 'house-rent-monthly', 'house-rent-annual', 'apartment-rent', 'apartment-rent-monthly', 'apartment-rent-annual']
          : ['house-sale-flat', 'apartment-sale-flat', 'flat-price'];
      requirements.push({ key: 'pricing.basis', type: 'enum', options });
    }
    const displayMode = pricing.priceDisplayMode ?? 'show-price';
    if (displayMode !== 'price-on-call' && displayMode !== 'offer-yours-first' && firstPositivePrice(pricing as never) <= 0) {
      requirements.push({ key: 'pricing.listed', type: 'object' });
    }
  }
  return requirements.filter(({ key }) => {
    const value = key.split('.').reduce<unknown>((current, part) =>
      current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, data);
    if (value === undefined || value === null || value === '') return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
    return false;
  });
}

// Create the actor's initial listing change row and return the first guided-form stage.
export async function initializeListingCreation(input: {
  actorAccountId: string;
  workingProfileId?: string | null;
}): Promise<ListingCreationInitialization> {
  const postingContext = await resolveListingCreateContext({
    actorAccountId: input.actorAccountId,
    requestedWorkingProfileId: input.workingProfileId,
  });
  const data = {
    stage: 'initialized',
    purpose: null,
    category: null,
    types: [],
    createdById: postingContext.createdById,
    createdForId: postingContext.createdForId,
    workingProfileId: postingContext.workingProfileId,
    postingAgencyId: postingContext.postingAgencyId,
    transferToId: postingContext.transferToId,
    workingProfileType: postingContext.profileType,
  };
  const creation = await prisma.listingChange.create({
    data: {
      accountId: input.actorAccountId,
      propertyId: null,
      status: 'creation_draft',
      isApproved: null,
      createdById: postingContext.createdById,
      createdForId: postingContext.createdForId,
      workingProfileId: postingContext.workingProfileId,
      data,
      modifiedOn: new Date(),
    },
    select: { id: true },
  });

  return {
    creationId: creation.id,
    stage: 'initialized',
    type: null,
    purpose: null,
    required: getListingCreationRequirements(data),
  };
}
