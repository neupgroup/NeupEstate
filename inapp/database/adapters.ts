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

import { PropertyPurpose, PropertyStatus, PropertyType } from '@prisma/client';

export function mapPurposeToEnum(value?: string | null): PropertyPurpose {
  switch (value?.trim().toLowerCase()) {
    case 'rent':
      return PropertyPurpose.RENT;
    case 'lease':
      return PropertyPurpose.LEASE;
    case 'sale':
    case 'sell':
    default:
      return PropertyPurpose.SALE;
  }
}

export function mapPurposeFromEnum(value?: PropertyPurpose | string | null): string {
  switch (value) {
    case PropertyPurpose.RENT:
      return 'Rent';
    case PropertyPurpose.LEASE:
      return 'Lease';
    case PropertyPurpose.SALE:
    default:
      return 'Sale';
  }
}

export function mapTypeToEnum(value?: string | null): PropertyType {
  switch (value?.trim().toLowerCase()) {
    case 'apartment':
    case 'flat':
    case 'penthouse':
      return PropertyType.APARTMENT;
    case 'land':
      return PropertyType.LAND;
    case 'commercial':
    case 'commercial space':
    case 'shop space':
      return PropertyType.COMMERCIAL;
    case 'house':
    case 'bungalow':
    case 'villa':
    case 'multiplex':
    default:
      return PropertyType.HOUSE;
  }
}

export function mapTypeFromEnum(value?: PropertyType | string | null): string {
  switch (value) {
    case PropertyType.APARTMENT:
      return 'Apartment';
    case PropertyType.LAND:
      return 'Land';
    case PropertyType.COMMERCIAL:
      return 'Commercial Space';
    case PropertyType.HOUSE:
    default:
      return 'House';
  }
}

export function mapStatusToEnum(value?: string | null): PropertyStatus {
  switch (value?.trim().toLowerCase().replace(/[\s-]+/g, '_')) {
    case 'awaiting_creation':
      return PropertyStatus.AWAITING_CREATION;
    case 'awaiting_deletion':
      return PropertyStatus.AWAITING_DELETION;
    case 'active':
      return PropertyStatus.ACTIVE;
    case 'sold':
      return PropertyStatus.SOLD;
    case 'rented':
      return PropertyStatus.RENTED;
    case 'archived':
      return PropertyStatus.ARCHIVED;
    case 'pending':
    default:
      return PropertyStatus.PENDING;
  }
}

export function mapStatusFromEnum(value?: PropertyStatus | string | null): string {
  switch (value) {
    case PropertyStatus.AWAITING_CREATION:
      return 'Awaiting Creation';
    case PropertyStatus.AWAITING_DELETION:
      return 'Awaiting Deletion';
    case PropertyStatus.ACTIVE:
      return 'Active';
    case PropertyStatus.SOLD:
      return 'Sold';
    case PropertyStatus.RENTED:
      return 'Rented';
    case PropertyStatus.ARCHIVED:
      return 'Archived';
    case PropertyStatus.PENDING:
    default:
      return 'Pending';
  }
}
