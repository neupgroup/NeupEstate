import { PropertyType, PropertyPurpose, PropertyStatus } from "@prisma/client";

export function mapPurposeToEnum(purpose: string | undefined | null): PropertyPurpose {
  switch (purpose?.toLowerCase()) {
    case "rent":   return PropertyPurpose.RENT;
    case "lease":  return PropertyPurpose.LEASE;
    default:       return PropertyPurpose.SALE;
  }
}

export function mapPurposeFromEnum(purpose: PropertyPurpose): string {
  switch (purpose) {
    case PropertyPurpose.RENT:  return "Rent";
    case PropertyPurpose.LEASE: return "Lease";
    default:                    return "Sale";
  }
}

export function mapTypeToEnum(type: string | undefined | null): PropertyType {
  switch (type?.toLowerCase()) {
    case "apartment":
    case "flat":      return PropertyType.APARTMENT;
    case "land":      return PropertyType.LAND;
    case "commercial": return PropertyType.COMMERCIAL;
    default:          return PropertyType.HOUSE;
  }
}

export function mapTypeFromEnum(type: PropertyType): string {
  switch (type) {
    case PropertyType.APARTMENT:  return "Apartment";
    case PropertyType.LAND:       return "Land";
    case PropertyType.COMMERCIAL: return "Commercial";
    default:                      return "House";
  }
}

export function mapStatusToEnum(status: string | undefined | null): PropertyStatus {
  switch (status?.toLowerCase()) {
    case "awaitingcreation":
    case "awaiting_creation": return PropertyStatus.AWAITING_CREATION;
    case "active":
    case "approved": return PropertyStatus.ACTIVE;
    case "sold":     return PropertyStatus.SOLD;
    case "rented":   return PropertyStatus.RENTED;
    case "archived": return PropertyStatus.ARCHIVED;
    default:         return PropertyStatus.PENDING;
  }
}

export function mapStatusFromEnum(status: PropertyStatus): string {
  switch (status) {
    case PropertyStatus.AWAITING_CREATION: return "awaitingCreation";
    case PropertyStatus.ACTIVE:    return "approved";
    case PropertyStatus.SOLD:      return "sold";
    case PropertyStatus.RENTED:    return "rented";
    case PropertyStatus.ARCHIVED:  return "archived";
    default:                       return "pending";
  }
}
