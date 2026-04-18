

import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData, UpdatePropertyInput, User, Agency, CreateAgencyInput, UpdateAgencyInput, TeamMember, CreateTeamMemberFormValues, UpdateTeamMemberFormValues, Requirement, CreateRequirementFormValues, Account, UpdateUserFormValues, Agent, CreateAgentFormValues } from '@/types';
import type { SavedPropertyEntry } from '@/services/property-service';
import { FirebaseAdapter } from '@/lib/adapters/firebase-adapter';
import { MongoDBAdapter } from '@/lib/adapters/mongodb-adapter';
import { PostgresAdapter } from '@/lib/adapters/postgres-adapter';

// Define a common interface for all database operations.
// This ensures that both Firebase and MongoDB adapters have the same methods.
export interface DatabaseAdapter {
    // Property methods
    addProperty(propertyData: Omit<ExtractedPropertyData, 'embedding'>): Promise<string>;
    createProperty(propertyData: CreatePropertyInput): Promise<string>;
    updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void>;
    updatePropertyImages(id: string, images: string[]): Promise<void>;
    addFetchToHistory(propertyId: string, data: ExtractedPropertyData): Promise<void>;
    deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void>;
    addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void>;
    deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void>;
    updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyData): Promise<void>;
    getProperties(): Promise<Property[]>;
    getPaginatedProperties(options: { page?: number; limit?: number; filters?: PropertyFilters; }): Promise<{ properties: Property[], totalCount: number }>;
    getPropertiesByAgent?(agentId: string): Promise<Property[]>;
    getFeaturedProperties(limit: number): Promise<Property[]>;
    getRecentProperties(limit: number): Promise<Property[]>;
    getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit: number): Promise<Property[]>;
    getFeaturedProjects(limit: number): Promise<Property[]>;
    getPremiumProperties(limit: number): Promise<Property[]>;
    getLuxuriousProperties(limit: number): Promise<Property[]>;
    getPendingProperties(limit: number): Promise<Property[]>;
    getPropertyById(id: string): Promise<Property | null>;
    getPropertyBySlug(slug: string): Promise<Property | null>;
    approveProperty(propertyId: string): Promise<void>;
    deleteProperty(propertyId: string): Promise<void>;
    isPropertySaved(userId: string, propertyId: string): Promise<boolean>;
    toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }>;
    getSavedProperties(userId: string): Promise<Property[]>;
    getLatestSavedProperties(limit: number): Promise<SavedPropertyEntry[]>;
    getUsersBySavedProperty(propertyId: string): Promise<User[]>;

    // User methods
    getUsers(): Promise<User[]>;
    updateUser(id: string, data: UpdateUserFormValues): Promise<void>;

    // Agency methods
    createAgency(agencyData: CreateAgencyInput): Promise<string>;
    getAgencies(options: { limit?: number; offset?: number }): Promise<Agency[]>;
    getFeaturedAgencies(limit: number): Promise<Agency[]>;
    getAgencyById(id: string): Promise<Agency | null>;
    updateAgency(id: string, agencyData: UpdateAgencyInput): Promise<void>;
    deleteAgency(agencyId: string): Promise<void>;

    // Agent methods
    createAgent(agentData: CreateAgentFormValues): Promise<string>;
    getAgents(options: { limit?: number; offset?: number }): Promise<Agent[]>;
    getAgentById(id: string): Promise<Agent | null>;
    getAgentBySlug(slug: string): Promise<Agent | null>;
    updateAgent(id: string, agentData: any): Promise<void>;
    deleteAgent(agentId: string): Promise<void>;
    getAgentsByLocation?(location: string): Promise<Agent[]>;

    // Team Member methods
    createTeamMember(memberData: CreateTeamMemberFormValues): Promise<string>;
    getTeamMembers(options: { limit?: number; offset?: number }): Promise<TeamMember[]>;
    getTeamMemberById(id: string): Promise<TeamMember | null>;
    getTeamMemberBySlug(slug: string): Promise<TeamMember | null>;
    updateTeamMember(id: string, memberData: UpdateTeamMemberFormValues): Promise<void>;
    deleteTeamMember(memberId: string): Promise<void>;

    // Requirement methods
    createRequirement(data: CreateRequirementFormValues): Promise<string>;
    getRequirementById(id: string): Promise<Requirement | null>;
    getRequirementByUserId(userId: string): Promise<Requirement[] | null>;
    updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void>;

    // Account methods
    createTemporaryAccount(ipAddress: string): Promise<string>;
    getAccounts(): Promise<Account[]>;
    getAccountById(id: string): Promise<Account | null>;
    updateAccountAccess(accountId: string, ipAddress: string): Promise<void>;
}

let dbAdapterInstance: DatabaseAdapter | null = null;

function initializeDbAdapter(): DatabaseAdapter {
    const provider = process.env.DATABASE_PROVIDER || 'firebase';

    if (provider === 'firebase') {
        return new FirebaseAdapter();
    } else if (provider === 'mongodb') {
        return new MongoDBAdapter();
    } else if (provider === 'postgresql') {
        return new PostgresAdapter();
    } else {
        throw new Error(`Unsupported database provider: ${provider}`);
    }
}

export function getDbAdapter(): DatabaseAdapter {
    if (!dbAdapterInstance) {
        dbAdapterInstance = initializeDbAdapter();
    }
    return dbAdapterInstance;
}
