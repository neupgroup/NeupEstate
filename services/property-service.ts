

'use server';

import { getDbAdapter } from '@/lib/database';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData as ExtractedPropertyDataType, UpdatePropertyInput, User } from '@/types';

type PropertyVisibilityOptions = {
    includeInactive?: boolean;
};

function filterActiveProperties(properties: Property[]): Property[] {
    return properties.filter((property) => property.isApproved);
}

function enforceActiveProperty(property: Property | null): Property | null {
    if (!property) return null;
    return property.isApproved ? property : null;
}

// The service layer now delegates all database operations to the active adapter.
// It is no longer concerned with which database provider backs the adapter.

export async function addProperty(propertyData: Omit<ExtractedPropertyDataType, 'embedding'>): Promise<string> {
    const db = getDbAdapter();
    return db.addProperty(propertyData);
}

export async function createProperty(propertyData: CreatePropertyInput): Promise<string> {
    const db = getDbAdapter();
    return db.createProperty(propertyData);
}

export async function updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void> {
    const db = getDbAdapter();
    return db.updateProperty(id, propertyData);
}

export async function updatePropertyImages(id: string, images: string[]): Promise<void> {
    const db = getDbAdapter();
    return db.updatePropertyImages(id, images);
}

export async function addFetchToHistory(propertyId: string, data: ExtractedPropertyDataType): Promise<void> {
    const db = getDbAdapter();
    return db.addFetchToHistory(propertyId, data);
}

export async function deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
    const db = getDbAdapter();
    return db.deleteFetchHistoryItem(propertyId, fetchedAt);
}

export async function addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
    const db = getDbAdapter();
    return db.addImagesToFetchHistory(propertyId, images);
}

export async function deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
    const db = getDbAdapter();
    return db.deleteImageFetchHistoryItem(propertyId, fetchedAt);
}

export async function updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyDataType): Promise<void> {
    const db = getDbAdapter();
    return db.updatePropertyWithExtractedData(id, propertyData);
}

export async function getProperties(options: PropertyVisibilityOptions = {}): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getProperties();
    if (options.includeInactive) return properties;
    return filterActiveProperties(properties);
}

export async function getPaginatedProperties(options: { page?: number; limit?: number; filters?: PropertyFilters; includeInactive?: boolean; } = {}): Promise<{ properties: Property[], totalCount: number }> {
    const db = getDbAdapter();
    if (options.includeInactive) {
        return db.getPaginatedProperties(options);
    }

    const filters = { ...(options.filters || {}), status: 'approved' as const };
    return db.getPaginatedProperties({
        page: options.page,
        limit: options.limit,
        filters,
    });
}

export async function getPropertiesByAgent(agentId: string, options: PropertyVisibilityOptions = {}): Promise<Property[]> {
    const db = getDbAdapter();
    if (db.getPropertiesByAgent) {
        const properties = await db.getPropertiesByAgent(agentId);
        if (options.includeInactive) return properties;
        return filterActiveProperties(properties);
    }
    // Fallback implementation if the adapter doesn't have a specific method
    const allProperties = await db.getProperties();
    const agentProperties = allProperties.filter(p => p.listingAgent === agentId);
    if (options.includeInactive) return agentProperties;
    return filterActiveProperties(agentProperties);
}

export async function getFeaturedProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getFeaturedProperties(limit);
    return filterActiveProperties(properties);
}

export async function getRecentProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getRecentProperties(limit);
    return filterActiveProperties(properties);
}

export async function getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getPropertiesByPurpose(purpose, limit);
    return filterActiveProperties(properties);
}

export async function getFeaturedProjects(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getFeaturedProjects(limit);
    return filterActiveProperties(properties);
}

export async function getPremiumProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getPremiumProperties(limit);
    return filterActiveProperties(properties);
}

export async function getLuxuriousProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getLuxuriousProperties(limit);
    return filterActiveProperties(properties);
}

export async function getPendingProperties(limit = 50): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getPendingProperties(limit);
}

export async function getPropertyById(id: string, options: PropertyVisibilityOptions = {}): Promise<Property | null> {
    const db = getDbAdapter();
    const property = await db.getPropertyById(id);
    if (options.includeInactive) return property;
    return enforceActiveProperty(property);
}

export async function getPropertyBySlug(slug: string, options: PropertyVisibilityOptions = {}): Promise<Property | null> {
    const db = getDbAdapter();
    const property = await db.getPropertyBySlug(slug);
    if (options.includeInactive) return property;
    return enforceActiveProperty(property);
}

export async function approveProperty(propertyId: string): Promise<void> {
    const db = getDbAdapter();
    return db.approveProperty(propertyId);
}

export async function deleteProperty(propertyId: string): Promise<void> {
    const db = getDbAdapter();
    return db.deleteProperty(propertyId);
}

export async function isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const db = getDbAdapter();
    return db.isPropertySaved(userId, propertyId);
}

export async function toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
    const db = getDbAdapter();
    return db.toggleSavedProperty(userId, propertyId);
}

export async function getSavedPropertiesForUser(userId: string): Promise<Property[]> {
    const db = getDbAdapter();
    const properties = await db.getSavedProperties(userId);
    return filterActiveProperties(properties);
}

export async function getSavedProperties(userId: string): Promise<Property[]> {
    return getSavedPropertiesForUser(userId);
}

export interface SavedPropertyEntry {
    userId: string;
    userName: string;
    propertyId: string;
    propertyTitle: string;
    savedAt: string;
}

export async function getLatestSavedProperties(limit = 20): Promise<SavedPropertyEntry[]> {
    const db = getDbAdapter();
    return db.getLatestSavedProperties(limit);
}

export async function getUsersBySavedProperty(propertyId: string): Promise<User[]> {
    const db = getDbAdapter();
    return db.getUsersBySavedProperty(propertyId);
}
