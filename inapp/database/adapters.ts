/*
::neup.documentation::inapp-database-adapters
::title In-App Database Adapters

::public

Maps application-facing property values to Prisma enum values and back.

::public end

::private

These adapters keep database enum conversion out of the Prisma client module.

::private end

::end
*/

export const PROPERTY_PURPOSE = {
  SALE: 'SALE',
  RENT: 'RENT',
  LEASE: 'LEASE',
} as const;

export type PropertyPurpose = typeof PROPERTY_PURPOSE[keyof typeof PROPERTY_PURPOSE];

export const PROPERTY_TYPE = {
  HOUSE: 'HOUSE',
  APARTMENT: 'APARTMENT',
  LAND: 'LAND',
  COMMERCIAL: 'COMMERCIAL',
} as const;

export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];

export const PROPERTY_STATUS = {
  AWAITING_CREATION: 'AWAITING_CREATION',
  AWAITING_DELETION: 'AWAITING_DELETION',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SOLD: 'SOLD',
  RENTED: 'RENTED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type PropertyStatus = typeof PROPERTY_STATUS[keyof typeof PROPERTY_STATUS];

export function mapPurposeToEnum(value?: string | null): PropertyPurpose {
  switch (value?.trim().toLowerCase()) {
    case 'rent':
      return PROPERTY_PURPOSE.RENT;
    case 'lease':
      return PROPERTY_PURPOSE.LEASE;
    case 'sale':
    case 'sell':
    default:
      return PROPERTY_PURPOSE.SALE;
  }
}

export function mapPurposeFromEnum(value?: PropertyPurpose | string | null): string {
  switch (value) {
    case PROPERTY_PURPOSE.RENT:
      return 'Rent';
    case PROPERTY_PURPOSE.LEASE:
      return 'Lease';
    case PROPERTY_PURPOSE.SALE:
    default:
      return 'Sale';
  }
}

export function mapTypeToEnum(value?: string | null): PropertyType {
  switch (value?.trim().toLowerCase()) {
    case 'apartment':
    case 'flat':
    case 'penthouse':
      return PROPERTY_TYPE.APARTMENT;
    case 'land':
      return PROPERTY_TYPE.LAND;
    case 'commercial':
    case 'commercial space':
    case 'shop space':
      return PROPERTY_TYPE.COMMERCIAL;
    case 'house':
    case 'bungalow':
    case 'villa':
    case 'multiplex':
    default:
      return PROPERTY_TYPE.HOUSE;
  }
}

export function mapTypeFromEnum(value?: PropertyType | string | null): string {
  switch (value) {
    case PROPERTY_TYPE.APARTMENT:
      return 'Apartment';
    case PROPERTY_TYPE.LAND:
      return 'Land';
    case PROPERTY_TYPE.COMMERCIAL:
      return 'Commercial Space';
    case PROPERTY_TYPE.HOUSE:
    default:
      return 'House';
  }
}

export function mapStatusToEnum(value?: string | null): PropertyStatus {
  switch (value?.trim().toLowerCase().replace(/[\s-]+/g, '_')) {
    case 'awaiting_creation':
      return PROPERTY_STATUS.AWAITING_CREATION;
    case 'awaiting_deletion':
      return PROPERTY_STATUS.AWAITING_DELETION;
    case 'active':
    case 'approved':
    case 'live':
    case 'published':
      return PROPERTY_STATUS.ACTIVE;
    case 'sold':
      return PROPERTY_STATUS.SOLD;
    case 'rented':
      return PROPERTY_STATUS.RENTED;
    case 'archived':
      return PROPERTY_STATUS.ARCHIVED;
    case 'pending':
    default:
      return PROPERTY_STATUS.PENDING;
  }
}

export function mapStatusFromEnum(value?: PropertyStatus | string | null): string {
  switch (value) {
    case PROPERTY_STATUS.AWAITING_CREATION:
      return 'Awaiting Creation';
    case PROPERTY_STATUS.AWAITING_DELETION:
      return 'Awaiting Deletion';
    case PROPERTY_STATUS.ACTIVE:
      return 'Active';
    case PROPERTY_STATUS.SOLD:
      return 'Sold';
    case PROPERTY_STATUS.RENTED:
      return 'Rented';
    case PROPERTY_STATUS.ARCHIVED:
      return 'Archived';
    case PROPERTY_STATUS.PENDING:
    default:
      return 'Pending';
  }
}
