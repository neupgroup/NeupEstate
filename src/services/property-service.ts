

'use server';

import { getDbAdapter } from '@/lib/database';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData as ExtractedPropertyDataType, UpdatePropertyInput, User } from '@/types';

// The service layer now delegates all database operations to the active adapter.
// It is no longer concerned with whether the backend is Firebase or MongoDB.

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

export async function getProperties(): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getProperties();
}

export async function getPaginatedProperties(options: { page?: number; limit?: number; filters?: PropertyFilters; } = {}): Promise<{ properties: Property[], totalCount: number }> {
    const db = getDbAdapter();
    return db.getPaginatedProperties(options);
}

export async function getPropertiesByAgent(agentId: string): Promise<Property[]> {
    const db = getDbAdapter();
    if (db.getPropertiesByAgent) {
        return db.getPropertiesByAgent(agentId);
    }
    // Fallback implementation if the adapter doesn't have a specific method
    const allProperties = await db.getProperties();
    return allProperties.filter(p => p.listingAgent === agentId);
}

export async function getFeaturedProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getFeaturedProperties(limit);
}

export async function getRecentProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getRecentProperties(limit);
}

export async function getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getPropertiesByPurpose(purpose, limit);
}

export async function getFeaturedProjects(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getFeaturedProjects(limit);
}

export async function getPremiumProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getPremiumProperties(limit);
}

export async function getLuxuriousProperties(limit = 4): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getLuxuriousProperties(limit);
}

export async function getPendingProperties(limit = 50): Promise<Property[]> {
    const db = getDbAdapter();
    return db.getPendingProperties(limit);
}

export async function getPropertyById(id: string): Promise<Property | null> {
    const db = getDbAdapter();
    return db.getPropertyById(id);
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
    const db = getDbAdapter();
    return db.getPropertyBySlug(slug);
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
    return db.getSavedProperties(userId);
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
