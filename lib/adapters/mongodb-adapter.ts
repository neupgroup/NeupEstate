

import { MongoClient, ObjectId, type Collection, type Db } from 'mongodb';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData, UpdatePropertyInput, User, Agency, CreateAgencyInput, UpdateAgencyInput, TeamMember, CreateTeamMemberFormValues, UpdateTeamMemberFormValues, Requirement, CreateRequirementFormValues, Account, Agent } from '@/types';
import type { DatabaseAdapter } from '@/lib/database';
import type { SavedPropertyEntry } from '@/services/property-service';
import { logProblem } from '@/services/problem-service';
import { ai, embedder } from '@/ai/genkit';
import { getUsers as getMockUsers } from '@/services/user-service'; // Keep for user seeding

// --- Helper Functions ---

async function generateEmbedding(text: string): Promise<number[] | undefined> {
    try {
        const { embedding } = await ai.embed({ embedder, content: text });
        return embedding;
    } catch (e) {
        await logProblem(e, 'mongodb-adapter-generateEmbedding');
        return undefined;
    }
}

async function geocodeLocation(location: string): Promise<{ lat: number, lng: number } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("Google Maps API Key not found, skipping geocoding.");
        return null;
    }
    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`);
        const data = await response.json();
        if (data.status === 'OK' && data.results[0]) return data.results[0].geometry.location;
        return null;
    } catch (error) {
        await logProblem(error, 'mongodb-adapter-geocodeLocation');
        return null;
    }
}

// Transforms a MongoDB document to our application's type
function fromMongo<T extends { _id: ObjectId }>(doc: T): Omit<T, '_id'> & { id: string } {
    if (!doc) return null as any;
    const { _id, ...data } = doc;
    return {
        id: _id.toHexString(),
        ...data,
    } as Omit<T, '_id'> & { id: string };
}

// --- MongoDB Adapter Class ---

export class MongoDBAdapter implements DatabaseAdapter {
    private client: MongoClient;
    private db: Db;
    private properties: Collection<any>;
    private users: Collection<any>;
    private agencies: Collection<any>;
    private team: Collection<any>;
    private requirements: Collection<any>;
    private accounts: Collection<any>;
    private agents: Collection<any>;

    constructor() {
        if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
            throw new Error("MongoDB URI or DB Name is not configured in .env file.");
        }
        this.client = new MongoClient(process.env.MONGODB_URI);
        this.db = this.client.db(process.env.MONGODB_DB_NAME);
        this.properties = this.db.collection('properties');
        this.users = this.db.collection('users');
        this.agencies = this.db.collection('agencies');
        this.team = this.db.collection('team');
        this.requirements = this.db.collection('requirements');
        this.accounts = this.db.collection('accounts');
        this.agents = this.db.collection('agents');
    }

    private async _connect() {
        if (!this.client.topology || !this.client.topology.isConnected()) {
            await this.client.connect();
        }
    }
    
    // --- Property Methods ---

    async addProperty(propertyData: Omit<ExtractedPropertyData, 'embedding'>): Promise<string> {
        await this._connect();
        const { isPropertyPage, ...rest } = propertyData;
        const textToEmbed = `${rest.title || ''}. ${rest.description || ''}`;
        
        const [embedding, coordinates] = await Promise.all([
            generateEmbedding(textToEmbed),
            rest.location ? geocodeLocation(rest.location) : null,
        ]);

        const dataToSave = {
            ...rest,
            agency: { id: 'imported', name: 'Imported Listing' },
            isFeatured: false,
            isApproved: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            embedding,
            ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
        };
        const result = await this.properties.insertOne(dataToSave);
        return result.insertedId.toHexString();
    }

    async createProperty(propertyData: CreatePropertyInput): Promise<string> {
        await this._connect();
        const textToEmbed = `${propertyData.title}. ${propertyData.description}`;
        const [embedding, coordinates] = await Promise.all([
            generateEmbedding(textToEmbed),
            geocodeLocation(propertyData.location),
        ]);

        const dataToSave = {
            ...propertyData,
            agency: { id: 'manual', name: 'Manually Added' },
            isFeatured: false,
            isApproved: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            embedding,
            ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
        };
        const result = await this.properties.insertOne(dataToSave);
        return result.insertedId.toHexString();
    }

    async updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void> {
        await this._connect();
        const textToEmbed = `${propertyData.title}. ${propertyData.description}`;
        const [embedding, coordinates] = await Promise.all([
            generateEmbedding(textToEmbed),
            geocodeLocation(propertyData.location),
        ]);
        
        const updatePayload = {
            ...propertyData,
            embedding,
            ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
            updatedAt: new Date(),
        };

        const { id: _, ...updateData } = updatePayload as any;
        await this.properties.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    }

    async updatePropertyImages(id: string, images: string[]): Promise<void> {
        await this._connect();
        await this.properties.updateOne({ _id: new ObjectId(id) }, { $set: { images, updatedAt: new Date() } });
    }
    
    async addFetchToHistory(propertyId: string, data: ExtractedPropertyData): Promise<void> {
        await this._connect();
        const newHistoryEntry = { fetchedAt: new Date().toISOString(), data };
        await this.properties.updateOne(
            { _id: new ObjectId(propertyId) },
            { $push: { fetchHistory: { $each: [newHistoryEntry], $position: 0 } } }
        );
    }
    
    async deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
        await this._connect();
        await this.properties.updateOne(
            { _id: new ObjectId(propertyId) },
            { $pull: { fetchHistory: { fetchedAt } } }
        );
    }

    async addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
        await this._connect();
        const newHistoryEntry = { fetchedAt: new Date().toISOString(), images };
        await this.properties.updateOne(
            { _id: new ObjectId(propertyId) },
            { $push: { imageFetchHistory: { $each: [newHistoryEntry], $position: 0 } } }
        );
    }

    async deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
        await this._connect();
        await this.properties.updateOne(
            { _id: new ObjectId(propertyId) },
            { $pull: { imageFetchHistory: { fetchedAt } } }
        );
    }

    async updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyData): Promise<void> {
        await this._connect();
        const { isPropertyPage, ...rest } = propertyData;
        const textToEmbed = `${rest.title || ''}. ${rest.description || ''}`;
        const [embedding, coordinates] = await Promise.all([
            generateEmbedding(textToEmbed),
            rest.location ? geocodeLocation(rest.location) : null,
        ]);
        
        const updatePayload = {
            ...rest,
            embedding,
            ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
            images: rest.images && rest.images.length > 0 ? rest.images : [`https://placehold.co/600x400.png`],
            updatedAt: new Date(),
        };
        await this.properties.updateOne({ _id: new ObjectId(id) }, { $set: updatePayload });
    }
    
    async getProperties(): Promise<Property[]> {
        await this._connect();
        const docs = await this.properties.find().sort({ createdAt: -1 }).toArray();
        return docs.map(doc => fromMongo(doc));
    }

    async getPaginatedProperties({ page = 1, limit = 20, filters }: { page?: number; limit?: number; filters?: PropertyFilters; }): Promise<{ properties: Property[], totalCount: number }> {
        await this._connect();
        const query: any = {};
        if (filters) {
            if (filters.id) {
                const property = await this.getPropertyById(filters.id);
                const properties = property ? [property] : [];
                return { properties, totalCount: properties.length };
            }
            if (filters.status) query.isApproved = filters.status === 'approved';
            if (filters.purpose?.length) query.purpose = { $in: filters.purpose };
            if (filters.category?.length) query.category = { $in: filters.category };
            if (filters.type?.length) query.type = { $in: filters.type };
            if (filters.location) query.location = { $regex: filters.location, $options: 'i' };
            if (filters.minPrice || filters.maxPrice) {
                query.price = {};
                if (filters.minPrice) query.price.$gte = filters.minPrice;
                if (filters.maxPrice) query.price.$lte = filters.maxPrice;
            }
            if (filters.bedrooms) query.bedrooms = { $gte: filters.bedrooms };
            if (filters.bathrooms) query.bathrooms = { $gte: filters.bathrooms };
            if (filters.searchTerm) query.$text = { $search: filters.searchTerm };
        }
        
        const totalCount = await this.properties.countDocuments(query);
        const docs = await this.properties.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
            
        return { properties: docs.map(doc => fromMongo(doc)), totalCount };
    }

    private async _getPropertiesByCriteria(query: any, sort: any, limit: number): Promise<Property[]> {
        await this._connect();
        query.isApproved = true;
        const docs = await this.properties.find(query).sort(sort).limit(limit).toArray();
        return docs.map(doc => fromMongo(doc));
    }

    getFeaturedProperties(limit: number): Promise<Property[]> { return this._getPropertiesByCriteria({ isFeatured: true }, { createdAt: -1 }, limit); }
    getRecentProperties(limit: number): Promise<Property[]> { return this._getPropertiesByCriteria({}, { createdAt: -1 }, limit); }
    getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit: number): Promise<Property[]> { return this._getPropertiesByCriteria({ purpose }, { createdAt: -1 }, limit); }
    getFeaturedProjects(limit: number): Promise<Property[]> { return this._getPropertiesByCriteria({ category: 'Project' }, { createdAt: -1 }, limit); }
    getPremiumProperties(limit: number): Promise<Property[]> { return this._getPropertiesByCriteria({ price: { $gte: 500000, $lte: 1500000 } }, { price: -1 }, limit); }
    getLuxuriousProperties(limit: number): Promise<Property[]> { return this._getPropertiesByCriteria({ price: { $gte: 1500000 } }, { price: -1 }, limit); }

    async getPendingProperties(limit: number): Promise<Property[]> {
        const { properties } = await this.getPaginatedProperties({ filters: { status: 'pending' }, limit });
        return properties;
    }
    
    async getPropertyById(id: string): Promise<Property | null> {
        if (!ObjectId.isValid(id)) return null;
        await this._connect();
        const doc = await this.properties.findOne({ _id: new ObjectId(id) });
        return doc ? fromMongo(doc) : null;
    }

    async getPropertyBySlug(slug: string): Promise<Property | null> {
        await this._connect();
        const doc = await this.properties.findOne({ slug });
        return doc ? fromMongo(doc) : null;
    }
    
    async getPropertiesByAgent(agentId: string): Promise<Property[]> {
        await this._connect();
        const docs = await this.properties.find({ listingAgent: agentId }).toArray();
        return docs.map(doc => fromMongo(doc));
    }

    async approveProperty(propertyId: string): Promise<void> {
        await this._connect();
        await this.properties.updateOne({ _id: new ObjectId(propertyId) }, { $set: { isApproved: true, updatedAt: new Date() } });
    }

    async deleteProperty(propertyId: string): Promise<void> {
        await this._connect();
        await this.properties.deleteOne({ _id: new ObjectId(propertyId) });
    }

    // --- User Saved Property Methods ---

    async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
        await this._connect();
        const user = await this.users.findOne({ id: userId, "savedProperties.propertyId": new ObjectId(propertyId) });
        return !!user;
    }

    async toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
        await this._connect();
        const user = await this.users.findOne({ id: userId });
        if (!user) {
            const mockUser = (await getMockUsers()).find(u => u.id === userId);
            await this.users.insertOne({
                id: userId,
                name: mockUser?.name || 'Unknown User',
                email: mockUser?.email || '',
                role: mockUser?.role || 'User',
                savedProperties: [],
            });
        }
        
        const isSaved = await this.isPropertySaved(userId, propertyId);
        const property = await this.getPropertyById(propertyId);

        if (isSaved) {
            await this.users.updateOne({ id: userId }, { $pull: { savedProperties: { propertyId: new ObjectId(propertyId) } } });
            return { saved: false };
        } else {
            const savedEntry = {
                propertyId: new ObjectId(propertyId),
                propertyTitle: property?.title,
                savedAt: new Date(),
            };
            await this.users.updateOne({ id: userId }, { $push: { savedProperties: savedEntry } });
            return { saved: true };
        }
    }

    async getSavedProperties(userId: string): Promise<Property[]> {
        await this._connect();
        const user = await this.users.findOne({ id: userId });
        if (!user || !user.savedProperties?.length) return [];
        
        const propertyIds = user.savedProperties.map((p: any) => p.propertyId);
        const savedProperties = await this.properties.find({ _id: { $in: propertyIds } }).toArray();
        
        return savedProperties.map(doc => fromMongo(doc));
    }

    async getLatestSavedProperties(limit: number): Promise<SavedPropertyEntry[]> {
        await this._connect();
        const pipeline = [
            { $unwind: "$savedProperties" },
            { $sort: { "savedProperties.savedAt": -1 } },
            { $limit: limit },
            { 
                $project: {
                    _id: 0,
                    userId: "$id",
                    userName: "$name",
                    propertyId: { $toString: "$savedProperties.propertyId" },
                    propertyTitle: "$savedProperties.propertyTitle",
                    savedAt: { $toString: "$savedProperties.savedAt" },
                }
            }
        ];
        const results = await this.users.aggregate(pipeline).toArray();
        return results as SavedPropertyEntry[];
    }

    async getUsersBySavedProperty(propertyId: string): Promise<User[]> {
        await this._connect();
        const usersWhoSaved = await this.users.find({ "savedProperties.propertyId": new ObjectId(propertyId) }).toArray();
        return usersWhoSaved.map(u => fromMongo(u));
    }
    
    // --- Agency Methods ---
    async createAgency(agencyData: CreateAgencyInput): Promise<string> {
        await this._connect();
        const result = await this.agencies.insertOne(agencyData);
        return result.insertedId.toHexString();
    }
    async getAgencies({ limit = 20, offset = 0 }: { limit?: number; offset?: number; }): Promise<Agency[]> {
        await this._connect();
        const docs = await this.agencies.find().skip(offset).limit(limit).toArray();
        return docs.map(doc => fromMongo(doc));
    }
    async getFeaturedAgencies(limit?: number): Promise<Agency[]> {
        await this._connect();
        const docs = await this.agencies.find().limit(limit || 4).toArray();
        return docs.map(doc => fromMongo(doc));
    }
    async getAgencyById(id: string): Promise<Agency | null> {
        if (!ObjectId.isValid(id)) return null;
        await this._connect();
        const doc = await this.agencies.findOne({ _id: new ObjectId(id) });
        return doc ? fromMongo(doc) : null;
    }
    async updateAgency(id: string, agencyData: UpdateAgencyInput): Promise<void> {
        await this._connect();
        await this.agencies.updateOne({ _id: new ObjectId(id) }, { $set: agencyData });
    }
    async deleteAgency(agencyId: string): Promise<void> {
        await this._connect();
        await this.agencies.deleteOne({ _id: new ObjectId(agencyId) });
    }

    // --- Agent Methods ---
    async createAgent(agentData: any): Promise<string> {
        await this._connect();
        const result = await this.agents.insertOne(agentData);
        return result.insertedId.toHexString();
    }
    async getAgents({ limit = 20, offset = 0 }: { limit?: number; offset?: number; }): Promise<Agent[]> {
        await this._connect();
        const docs = await this.agents.find().skip(offset).limit(limit).toArray();
        return docs.map(doc => fromMongo(doc));
    }
    async getAgentById(id: string): Promise<Agent | null> {
        if (!ObjectId.isValid(id)) return null;
        await this._connect();
        const doc = await this.agents.findOne({ _id: new ObjectId(id) });
        return doc ? fromMongo(doc) : null;
    }
    async getAgentBySlug(slug: string): Promise<Agent | null> {
        await this._connect();
        const doc = await this.agents.findOne({ slug });
        return doc ? fromMongo(doc) : null;
    }
    async updateAgent(id: string, agentData: any): Promise<void> {
        await this._connect();
        await this.agents.updateOne({ _id: new ObjectId(id) }, { $set: agentData });
    }
    async deleteAgent(agentId: string): Promise<void> {
        await this._connect();
        await this.agents.deleteOne({ _id: new ObjectId(agentId) });
    }
    
    // --- Team Member Methods ---
    async createTeamMember(memberData: CreateTeamMemberFormValues): Promise<string> {
        await this._connect();
        const result = await this.team.insertOne(memberData);
        return result.insertedId.toHexString();
    }
    async getTeamMembers({ limit = 20, offset = 0 }: { limit?: number; offset?: number; }): Promise<TeamMember[]> {
        await this._connect();
        const docs = await this.team.find().skip(offset).limit(limit).toArray();
        return docs.map(doc => fromMongo(doc));
    }
    async getTeamMemberById(id: string): Promise<TeamMember | null> {
        if (!ObjectId.isValid(id)) return null;
        await this._connect();
        const doc = await this.team.findOne({ _id: new ObjectId(id) });
        return doc ? fromMongo(doc) : null;
    }
    async updateTeamMember(id: string, memberData: UpdateTeamMemberFormValues): Promise<void> {
        await this._connect();
        await this.team.updateOne({ _id: new ObjectId(id) }, { $set: memberData as any });
    }
    async deleteTeamMember(memberId: string): Promise<void> {
        await this._connect();
        await this.team.deleteOne({ _id: new ObjectId(memberId) });
    }
    async getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
        await this._connect();
        const doc = await this.team.findOne({ slug });
        return doc ? fromMongo(doc) : null;
    }
    
    // --- User Methods ---
    async getUsers(): Promise<User[]> {
        await this._connect();
        const docs = await this.users.find().toArray();
        if (docs.length === 0) {
            // Seed mock users if collection is empty
            const mockUsers = await getMockUsers();
            await this.users.insertMany(mockUsers);
            return mockUsers;
        }
        return docs.map(doc => fromMongo(doc));
    }

    // --- Requirement Methods ---
    async createRequirement(data: CreateRequirementFormValues): Promise<string> {
        await this._connect();
        const requirementData = { ...data, createdAt: new Date(), updatedAt: new Date() };
        const result = await this.requirements.insertOne(requirementData);
        return result.insertedId.toHexString();
    }

    async getRequirementById(id: string): Promise<Requirement | null> {
        if (!ObjectId.isValid(id)) return null;
        await this._connect();
        const doc = await this.requirements.findOne({ _id: new ObjectId(id) });
        return doc ? fromMongo(doc) : null;
    }

    async getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
        await this._connect();
        const docs = await this.requirements.find({ userId }).toArray();
        return docs.length > 0 ? docs.map(doc => fromMongo(doc)) : null;
    }

    async updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void> {
        await this._connect();
        const updateData = { ...data, updatedAt: new Date() };
        await this.requirements.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    }

    // --- Account Methods ---
    async createTemporaryAccount(): Promise<string> {
        await this._connect();
        const now = new Date();
        const result = await this.accounts.insertOne({
            registered: false,
            created_on: now.toISOString(),
            accessed_on: now.toISOString(),
        });
        return result.insertedId.toHexString();
    }

    async getAccounts(): Promise<Account[]> {
        await this._connect();
        const docs = await this.accounts.find().toArray();
        return docs.map(doc => fromMongo(doc));
    }

    async getAccountById(id: string): Promise<Account | null> {
        if (!ObjectId.isValid(id)) return null;
        await this._connect();
        const doc = await this.accounts.findOne({ _id: new ObjectId(id) });
        return doc ? fromMongo(doc) : null;
    }
}
