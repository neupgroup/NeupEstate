

import { getFirestore } from '@/lib/firebase';
import { FieldPath } from 'firebase-admin/firestore';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData as ExtractedPropertyDataType, UpdatePropertyInput, User, Agency, CreateAgencyInput, UpdateAgencyInput, TeamMember, CreateTeamMemberFormValues, UpdateTeamMemberFormValues, Requirement, CreateRequirementFormValues, Account, UpdateUserFormValues, Agent } from '@/types';
import { ai, embedder } from '@/ai/genkit';
import { logProblem } from '@/services/problem-service';
import type { DatabaseAdapter } from '../database';
import type { SavedPropertyEntry } from '@/services/property-service';

type ExtractedPropertyData = Omit<ExtractedPropertyDataType, 'embedding'>;

// Helper to generate embedding
async function generateEmbedding(text: string): Promise<number[] | undefined> {
    try {
        const { embedding } = await ai.embed({
            model: embedder,
            content: text,
        });
        return embedding;
    } catch (e) {
        console.error("Failed to generate embedding:", e);
        return undefined;
    }
}

async function geocodeLocation(location: string): Promise<{ lat: number, lng: number } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("Google Maps API Key not found, skipping geocoding.");
        return null;
    }
    const requestUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
    try {
        const response = await fetch(requestUrl);
        const data = await response.json();
        if (data.status === 'OK' && data.results[0]) {
            return data.results[0].geometry.location;
        } else {
            await logProblem(new Error(`Geocoding failed for location "${location}": ${data.status}`), 'geocodeLocation', data);
            return null;
        }
    } catch (error: any) {
        await logProblem(error, 'geocodeLocation', { requestUrl });
        return null;
    }
}

function filterPropertiesInMemory(properties: Property[], filters?: PropertyFilters): Property[] {
    if (!filters || Object.keys(filters).length === 0) return properties;
    return properties.filter(p => {
        let match = true;
        if (filters.status) match = match && p.isApproved === (filters.status === 'approved');
        if (filters.purpose && filters.purpose.length > 0) match = match && filters.purpose.includes(p.purpose);
        if (filters.category && filters.category.length > 0) match = match && filters.category.includes(p.category);
        if (filters.type && filters.type.length > 0) match = match && filters.type.includes(p.type);
        if (filters.location) match = match && p.location.toLowerCase().includes(filters.location.toLowerCase());
        if (filters.minPrice !== undefined) match = match && p.price >= filters.minPrice;
        if (filters.maxPrice !== undefined) match = match && p.price <= filters.maxPrice;
        if (filters.searchTerm) {
            const lowercasedSearchTerm = filters.searchTerm.toLowerCase();
            const agentMatch = p.listingAgent ? p.listingAgent.toLowerCase().includes(lowercasedSearchTerm) : false;
            match = match && (p.title.toLowerCase().includes(lowercasedSearchTerm) || p.description.toLowerCase().includes(lowercasedSearchTerm) || agentMatch);
        }
        if (filters.bedrooms !== undefined) match = match && p.bedrooms >= filters.bedrooms;
        if (filters.bathrooms !== undefined) match = match && p.bathrooms >= filters.bathrooms;
        return match;
    });
}

function toProperty(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>): Property {
    const data = doc.data()!;
    let createdAt: string | undefined;
    let updatedAt: string | undefined;
    
    try {
        createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString();
        updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString();
    } catch (e) {
        // Gracefully handle cases where timestamps might be missing or malformed
    }

    return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        price: data.price || 0,
        location: data.location || '',
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        area: data.area || 0,
        purpose: data.purpose || 'Sale',
        category: data.category || 'House',
        type: data.type || 'Residential',
        images: data.images || [],
        amenities: data.amenities || [],
        agency: data.agency || { id: 'unknown', name: 'Unknown Agency', logoUrl: '' },
        isApproved: data.isApproved || false,
        sourceUrl: data.sourceUrl,
        createdAt,
        updatedAt,
    } as Property;
}

function toAgency(doc: FirebaseFirestore.DocumentSnapshot): Agency {
    return { id: doc.id, ...doc.data() } as Agency;
}

function toAgent(doc: FirebaseFirestore.DocumentSnapshot): Agent {
    const data = doc.data()!;
    return {
        id: doc.id,
        registered: data.registered,
        location: data.location,
        userId: data.userId,
        name: data.name,
        contact: data.contact || {},
        photoUrl: data.photoUrl,
        specializations: data.specializations || [],
        slug: data.slug || '',
    };
}

function toTeamMember(doc: FirebaseFirestore.DocumentSnapshot): TeamMember {
    return { id: doc.id, ...doc.data() } as TeamMember;
}

function toUser(doc: FirebaseFirestore.DocumentSnapshot): User {
    const data = doc.data()!;
    let lastLogin: string | undefined;

    if (data.lastLogin) {
        // Check if it's a Firestore Timestamp
        if (typeof data.lastLogin.toDate === 'function') {
            lastLogin = data.lastLogin.toDate().toISOString();
        } 
        // Check if it's already a string (like an ISO string)
        else if (typeof data.lastLogin === 'string') {
            lastLogin = data.lastLogin;
        }
        // Fallback for other potential formats, like a raw Date object
        else {
            try {
                lastLogin = new Date(data.lastLogin).toISOString();
            } catch (e) {
                // Could not convert, leave it undefined
            }
        }
    }
    
    return {
        id: doc.id,
        name: data.name,
        email: data.email || [],
        phone: data.phone || [],
        location: data.location,
        role: data.role,
        lastLogin: lastLogin,
        avatarUrl: data.avatarUrl,
    };
}

function toRequirement(doc: FirebaseFirestore.DocumentSnapshot): Requirement {
    const data = doc.data()!;
    return {
        id: doc.id,
        userId: data.userId,
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        location: data.location,
        propertyType: data.propertyType,
        urgency: data.urgency,
        paymentMethod: data.paymentMethod,
        requiredTime: data.requiredTime,
        purpose: data.purpose,
        loan: data.loan,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString(),
    };
}

function toAccount(doc: FirebaseFirestore.DocumentSnapshot): Account {
    const data = doc.data() as any;
    const baseAccount = {
        id: doc.id,
        created_on: data.created_on?.toDate ? data.created_on.toDate().toISOString() : new Date(data.created_on).toISOString(),
        accessed_on: data.accessed_on?.toDate ? data.accessed_on.toDate().toISOString() : new Date(data.accessed_on).toISOString(),
        created_from_ip: data.created_from_ip,
        last_accessed_from_ip: data.last_accessed_from_ip,
    };
    if (data.registered) {
        return {
            ...baseAccount,
            registered: true,
            account_type: data.account_type,
        }
    } else {
        return {
            ...baseAccount,
            registered: false,
            account_type: 'guest',
            name: data.name,
            location: data.location,
        }
    }
}


export class FirebaseAdapter implements DatabaseAdapter {
      private firestore = getFirestore();
  
      private _getDb() {
          if (!this.firestore) {
              throw new Error("Firestore is not available. Check Firebase credentials.");
          }
          return this.firestore;
      }
  
      async addProperty(propertyData: ExtractedPropertyData): Promise<string> {
          const db = this._getDb();
          const { isPropertyPage, ...restOfPropertyData } = propertyData;
          const textToEmbed = `${restOfPropertyData.title || ''}. ${restOfPropertyData.description || ''}`;
          const embedding = await generateEmbedding(textToEmbed);
          const coordinates = restOfPropertyData.location ? await geocodeLocation(restOfPropertyData.location) : null;
  
          const dataToSave = {
              ...restOfPropertyData,
              agency: { id: 'imported', name: 'Imported Listing', logoUrl: `https://placehold.co/100x40.png` },
              isFeatured: false,
              isApproved: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              embedding,
              ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
          };
          const cleanedData = Object.fromEntries(Object.entries(dataToSave).filter(([_, v]) => v !== undefined));
          const docRef = await db.collection('properties').add(cleanedData);
          return docRef.id;
      }
  
      async createProperty(propertyData: CreatePropertyInput): Promise<string> {
          const db = this._getDb();
          const textToEmbed = `${propertyData.title}. ${propertyData.description}`;
          const embedding = await generateEmbedding(textToEmbed);
          const coordinates = await geocodeLocation(propertyData.location);
  
          const dataToSave = {
              ...propertyData,
              agency: { id: 'manual', name: 'Manually Added', logoUrl: `https://placehold.co/100x40.png` },
              isFeatured: false,
              isApproved: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              embedding,
              ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
          };
          const cleanedData = Object.fromEntries(Object.entries(dataToSave).filter(([_, v]) => v !== undefined && v !== null));
          const docRef = await db.collection('properties').add(cleanedData);
          return docRef.id;
      }
  
      async updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void> {
          const db = this._getDb();
          const propertyRef = db.collection('properties').doc(id);
          const textToEmbed = `${propertyData.title}. ${propertyData.description}`;
          const embedding = await generateEmbedding(textToEmbed);
          const coordinates = await geocodeLocation(propertyData.location);
          const updatePayload = {
              ...propertyData,
              embedding,
              ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
              updatedAt: new Date(),
          };
          const cleanedPayload = Object.fromEntries(Object.entries(updatePayload).filter(([_, v]) => v !== undefined));
          await propertyRef.update(cleanedPayload);
      }
      
      async updatePropertyImages(id: string, images: string[]): Promise<void> {
          const db = this._getDb();
          await db.collection('properties').doc(id).update({ images, updatedAt: new Date() });
      }
  
      async addFetchToHistory(propertyId: string, data: ExtractedPropertyDataType): Promise<void> {
          const db = this._getDb();
          const propertyRef = db.collection('properties').doc(propertyId);
          await db.runTransaction(async t => {
              const doc = await t.get(propertyRef);
              if (!doc.exists) throw new Error("Document does not exist!");
              const currentHistory = (doc.data() as Property).fetchHistory || [];
              const newHistoryEntry = { fetchedAt: new Date().toISOString(), data };
              t.update(propertyRef, { fetchHistory: [newHistoryEntry, ...currentHistory] });
          });
      }
  
      async deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
          const db = this._getDb();
          const propertyRef = db.collection('properties').doc(propertyId);
          await db.runTransaction(async t => {
              const doc = await t.get(propertyRef);
              if (!doc.exists) throw new Error("Document does not exist!");
              const history = (doc.data() as Property).fetchHistory || [];
              const newHistory = history.filter(item => item.fetchedAt !== fetchedAt);
              t.update(propertyRef, { fetchHistory: newHistory });
          });
      }
  
      async addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
          const db = this._getDb();
          const propertyRef = db.collection('properties').doc(propertyId);
          const newHistoryEntry = { fetchedAt: new Date().toISOString(), images };
          await db.runTransaction(async t => {
              const doc = await t.get(propertyRef);
              if (!doc.exists) throw new Error("Document does not exist!");
              const history = (doc.data()?.imageFetchHistory as Property['imageFetchHistory']) || [];
              t.update(propertyRef, { imageFetchHistory: [newHistoryEntry, ...history] });
          });
      }
  
      async deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
          const db = this._getDb();
          const propertyRef = db.collection('properties').doc(propertyId);
          await db.runTransaction(async t => {
              const doc = await t.get(propertyRef);
              if (!doc.exists) throw new Error("Document does not exist!");
              const history = (doc.data()?.imageFetchHistory as Property['imageFetchHistory']) || [];
              const newHistory = history.filter(item => item.fetchedAt !== fetchedAt);
              t.update(propertyRef, { imageFetchHistory: newHistory });
          });
      }
  
      async updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyDataType): Promise<void> {
          const db = this._getDb();
          const { isPropertyPage, ...rest } = propertyData;
          const textToEmbed = `${rest.title || ''}. ${rest.description || ''}`;
          const embedding = await generateEmbedding(textToEmbed);
          const coordinates = rest.location ? await geocodeLocation(rest.location) : null;
  
          const updatePayload = {
              ...rest,
              embedding,
              ...(coordinates && { latitude: coordinates.lat, longitude: coordinates.lng }),
              images: rest.images && rest.images.length > 0 ? rest.images : [`https://placehold.co/600x400.png`],
              updatedAt: new Date(),
          };
          const cleanedPayload = Object.fromEntries(Object.entries(updatePayload).filter(([_, v]) => v !== undefined));
          await db.collection('properties').doc(id).update(cleanedPayload);
      }
      
      async getProperties(): Promise<Property[]> {
          const db = this._getDb();
          const snapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
          if (snapshot.empty) return [];
          return snapshot.docs.map(toProperty);
      }
  
      async getPaginatedProperties({ page = 1, limit = 20, filters }: { page?: number; limit?: number; filters?: PropertyFilters; }): Promise<{ properties: Property[], totalCount: number }> {
          const db = this._getDb();
          if (filters?.id) {
              const property = await this.getPropertyById(filters.id);
              const properties = property ? [property] : [];
              return { properties, totalCount: properties.length };
          }
          let query: FirebaseFirestore.Query = db.collection('properties');
          const inMemoryFilters: PropertyFilters = { ...filters };
          if (filters?.status) {
              query = query.where('isApproved', '==', filters.status === 'approved');
              delete inMemoryFilters.status;
          }
          if (filters?.purpose && filters.purpose.length > 0) {
              query = query.where('purpose', 'in', filters.purpose);
              delete inMemoryFilters.purpose;
          }
          const snapshot = await query.get();
          const dbProperties = snapshot.docs.map(toProperty);
          const finalFiltered = filterPropertiesInMemory(dbProperties, inMemoryFilters);
          finalFiltered.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
          const totalCount = finalFiltered.length;
          const offset = (page - 1) * limit;
          return { properties: finalFiltered.slice(offset, offset + limit), totalCount };
      }
      
      private async _getPropertiesByCriteria(criteria: { field: string, operator: FirebaseFirestore.WhereFilterOp, value: any }[], orderBy: string, limit: number): Promise<Property[]> {
          const db = this._getDb();
          let query: FirebaseFirestore.Query = db.collection('properties').where('isApproved', '==', true);
          criteria.forEach(c => query = query.where(c.field, c.operator, c.value));
          
          // Firestore requires a corresponding index for compound queries with orderBy.
          // To avoid this, we can fetch the data and sort it in memory.
          // This is less efficient for large datasets but prevents runtime errors without manual index creation.
          query = query.limit(limit * 5); // Fetch more docs to have a reasonable pool for sorting
      
          const snapshot = await query.get();
          const properties = snapshot.docs.map(toProperty);
      
          // Manual sorting
          properties.sort((a, b) => {
              const valA = a[orderBy as keyof Property];
              const valB = b[orderBy as keyof Property];
              if (valA === undefined || valB === undefined) return 0;
              if (valA > valB) return -1;
              if (valA < valB) return 1;
              return 0;
          });
      
          return properties.slice(0, limit);
      }
  
      getFeaturedProperties(limit: number): Promise<Property[]> {
          return this._getPropertiesByCriteria([{ field: 'isFeatured', operator: '==', value: true }], 'createdAt', limit);
      }
  
      getRecentProperties(limit: number): Promise<Property[]> {
          return this._getPropertiesByCriteria([], 'createdAt', limit);
      }
      
      getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit: number): Promise<Property[]> {
          return this._getPropertiesByCriteria([{ field: 'purpose', operator: '==', value: purpose }], 'createdAt', limit);
      }
      
      async getPropertiesByAgent(agentId: string): Promise<Property[]> {
          const db = this._getDb();
          const snapshot = await db.collection('properties').where('listingAgent', '==', agentId).get();
          return snapshot.docs.map(toProperty);
      }
  
      getFeaturedProjects(limit: number): Promise<Property[]> {
          return this._getPropertiesByCriteria([{ field: 'category', operator: '==', value: 'Project' }], 'createdAt', limit);
      }
  
      getPremiumProperties(limit: number): Promise<Property[]> {
          return this._getPropertiesByCriteria([
              { field: 'price', operator: '>=', value: 500000 },
              { field: 'price', operator: '<=', value: 1500000 }
          ], 'price', limit);
      }
  
      getLuxuriousProperties(limit: number): Promise<Property[]> {
          return this._getPropertiesByCriteria([{ field: 'price', operator: '>=', value: 1500000 }], 'price', limit);
      }
  
      async getPendingProperties(limit: number): Promise<Property[]> {
          const { properties } = await this.getPaginatedProperties({ filters: { status: 'pending' }, limit });
          return properties;
      }
  
      async getPropertyById(id: string): Promise<Property | null> {
          const db = this._getDb();
          const doc = await db.collection('properties').doc(id).get();
          return doc.exists ? toProperty(doc) : null;
      }
  
      async getPropertyBySlug(slug: string): Promise<Property | null> {
          const db = this._getDb();
          const snapshot = await db.collection('properties').where('slug', '==', slug).limit(1).get();
          return snapshot.empty ? null : toProperty(snapshot.docs[0]);
      }
  
      async approveProperty(propertyId: string): Promise<void> {
          const db = this._getDb();
          await db.collection('properties').doc(propertyId).update({ isApproved: true, updatedAt: new Date() });
      }
  
      async deleteProperty(propertyId: string): Promise<void> {
          const db = this._getDb();
          await db.collection('properties').doc(propertyId).delete();
      }
      
      async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
          const db = this._getDb();
          const doc = await db.collection('users').doc(userId).collection('savedProperties').doc(propertyId).get();
          return doc.exists;
      }
  
      async toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
          const db = this._getDb();
          const userDocRef = db.collection('users').doc(userId);
          const savedDocRef = userDocRef.collection('savedProperties').doc(propertyId);
          const propertyDoc = await this.getPropertyById(propertyId);
          if (!propertyDoc) throw new Error("Property not found");
  
          let userDoc = await userDocRef.get();
          if (!userDoc.exists) {
              console.log(`User ${userId} not found, creating a new one...`);
              // A simple mock user structure, can be expanded later
              const newUser: Partial<User> = {
                  id: userId,
                  name: 'Mock User',
                  email: [],
                  role: 'User',
                  lastLogin: new Date().toISOString(),
              };
              await userDocRef.set(newUser);
              userDoc = await userDocRef.get();
              if (!userDoc.exists) throw new Error("Failed to create user");
          }
  
          const savedPropertyDoc = await savedDocRef.get();
          if (savedPropertyDoc.exists) {
              await savedDocRef.delete();
              return { saved: false };
          } else {
              await savedDocRef.set({
                  propertyId,
                  propertyTitle: propertyDoc.title,
                  userId: userDoc.id,
                  userName: userDoc.data()?.name,
                  savedAt: new Date(),
              });
              return { saved: true };
          }
      }
  
      async getSavedProperties(userId: string): Promise<Property[]> {
          const db = this._getDb();
          const snapshot = await db.collection('users').doc(userId).collection('savedProperties').orderBy('savedAt', 'desc').get();
          if (snapshot.empty) return [];
          const propertyIds = snapshot.docs.map(doc => doc.id);
          if (propertyIds.length === 0) return [];
          if (propertyIds.length > 30) {
              console.warn("User has more than 30 saved properties, truncating results.");
          }
          const limitedIds = propertyIds.slice(0, 30);
          const propertiesSnapshot = await db.collection('properties').where(FieldPath.documentId(), 'in', limitedIds).get();
          const propertiesById = new Map(propertiesSnapshot.docs.map(doc => [doc.id, toProperty(doc)]));
          return limitedIds.map(id => propertiesById.get(id)).filter((p): p is Property => !!p);
      }
      
      async getLatestSavedProperties(limit: number): Promise<SavedPropertyEntry[]> {
          const db = this._getDb();
          const users = await this.getUsers();
          if (!users || users.length === 0) return [];
          let allSaved: SavedPropertyEntry[] = [];
          for (const user of users) {
              const snapshot = await db.collection('users').doc(user.id).collection('savedProperties').orderBy('savedAt', 'desc').get();
              snapshot.docs.forEach(doc => {
                  const data = doc.data();
                  allSaved.push({
                      userId: data.userId,
                      userName: data.userName,
                      propertyId: data.propertyId,
                      propertyTitle: data.propertyTitle,
                      savedAt: data.savedAt.toDate().toISOString(),
                  });
              });
          }
          allSaved.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
          return allSaved.slice(0, limit);
      }
  
      async getUsersBySavedProperty(propertyId: string): Promise<User[]> {
          const db = this._getDb();
          const snapshot = await db.collectionGroup('savedProperties').where('propertyId', '==', propertyId).get();
          if (snapshot.empty) return [];
          const userIds = snapshot.docs.map(doc => doc.data().userId);
          const allUsers = await this.getUsers();
          return allUsers.filter(user => userIds.includes(user.id));
      }
  
      // Agency Methods
      async createAgency(agencyData: CreateAgencyInput): Promise<string> {
          const db = this._getDb();
          const docRef = await db.collection('agencies').add(agencyData);
          return docRef.id;
      }
  
      async getAgencies({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agency[]> {
          const db = this._getDb();
          const snapshot = await db.collection('agencies').limit(limit).offset(offset).get();
          return snapshot.docs.map(toAgency);
      }
  
      async getFeaturedAgencies(limit = 4): Promise<Agency[]> {
          const db = this._getDb();
          const snapshot = await db.collection('agencies').limit(limit).get();
          return snapshot.docs.map(toAgency);
      }
  
      async getAgencyById(id: string): Promise<Agency | null> {
          const db = this._getDb();
          const docRef = await db.collection('agencies').doc(id).get();
          return docRef.exists ? toAgency(docRef) : null;
      }
  
      async updateAgency(id: string, agencyData: UpdateAgencyInput): Promise<void> {
          const db = this._getDb();
          await db.collection('agencies').doc(id).update(agencyData);
      }
  
      async deleteAgency(agencyId: string): Promise<void> {
          const db = this._getDb();
          await db.collection('agencies').doc(agencyId).delete();
      }

      // Agent Methods
      async createAgent(agentData: any): Promise<string> {
          const db = this._getDb();
          const docRef = await db.collection('agents').add(agentData);
          return docRef.id;
      }

      async getAgents({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
          const db = this._getDb();
          const snapshot = await db.collection('agents').limit(limit).offset(offset).get();
          return snapshot.docs.map(toAgent);
      }

      async getAgentById(id: string): Promise<Agent | null> {
          const db = this._getDb();
          const docRef = await db.collection('agents').doc(id).get();
          return docRef.exists ? toAgent(docRef) : null;
      }
      
      async getAgentBySlug(slug: string): Promise<Agent | null> {
          const db = this._getDb();
          const snapshot = await db.collection('agents').where('slug', '==', slug).limit(1).get();
          return snapshot.empty ? null : toAgent(snapshot.docs[0]);
      }

      async updateAgent(id: string, agentData: any): Promise<void> {
          const db = this._getDb();
          await db.collection('agents').doc(id).update(agentData);
      }

      async deleteAgent(agentId: string): Promise<void> {
          const db = this._getDb();
          await db.collection('agents').doc(agentId).delete();
      }
  
      // Team Member Methods
      async createTeamMember(memberData: CreateTeamMemberFormValues): Promise<string> {
          const db = this._getDb();
          const docRef = await db.collection('team').add(memberData);
          return docRef.id;
      }
  
      async getTeamMembers({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<TeamMember[]> {
          const db = this._getDb();
          const snapshot = await db.collection('team').limit(limit).offset(offset).get();
          return snapshot.docs.map(toTeamMember);
      }
  
      async getTeamMemberById(id: string): Promise<TeamMember | null> {
          const db = this._getDb();
          const docRef = await db.collection('team').doc(id).get();
          return docRef.exists ? toTeamMember(docRef) : null;
      }
      
      async getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
          const db = this._getDb();
          const snapshot = await db.collection('team').where('slug', '==', slug).limit(1).get();
          return snapshot.empty ? null : toTeamMember(snapshot.docs[0]);
      }
  
      async updateTeamMember(id: string, memberData: UpdateTeamMemberFormValues): Promise<void> {
          const db = this._getDb();
          await db.collection('team').doc(id).update(memberData as any);
      }
  
      async deleteTeamMember(memberId: string): Promise<void> {
          const db = this._getDb();
          await db.collection('team').doc(memberId).delete();
      }
  
      // User Methods
      async getUsers(): Promise<User[]> {
          const db = this._getDb();
          const snapshot = await db.collection('users').get();
          return snapshot.docs.map(toUser);
      }

      async updateUser(id: string, data: UpdateUserFormValues): Promise<void> {
          const db = this._getDb();
          await db.collection('users').doc(id).set(data, { merge: true });
      }

      // Requirement Methods
      async createRequirement(data: CreateRequirementFormValues): Promise<string> {
          const db = this._getDb();
          try {
              const requirementData = { ...data, createdAt: new Date(), updatedAt: new Date() };
              const cleanedData = Object.fromEntries(Object.entries(requirementData).filter(([_, v]) => v !== undefined));
              const docRef = await db.collection('requirements').add(cleanedData);
              return docRef.id;
          } catch (error) {
              await logProblem(error, 'createRequirement-firebase');
              throw error;
          }
      }

      async getRequirementById(id: string): Promise<Requirement | null> {
        const db = this._getDb();
        try {
            const doc = await db.collection('requirements').doc(id).get();
            return doc.exists ? toRequirement(doc) : null;
        } catch (error) {
            await logProblem(error, `getRequirementById-firebase (ID: ${id})`);
            return null;
        }
      }

      async getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
          const db = this._getDb();
          try {
              const snapshot = await db.collection('requirements').where('userId', '==', userId).get();
              if (snapshot.empty) return null;
              return snapshot.docs.map(toRequirement);
          } catch (error) {
              await logProblem(error, `getRequirementByUserId-firebase (User ID: ${userId})`);
              return null;
          }
      }
      
      async updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void> {
          const db = this._getDb();
          try {
              const requirementData = { ...data, updatedAt: new Date() };
              const cleanedData = Object.fromEntries(Object.entries(requirementData).filter(([_, v]) => v !== undefined));
              await db.collection('requirements').doc(id).update(cleanedData);
          } catch (error) {
              await logProblem(error, `updateRequirement-firebase (ID: ${id})`);
              throw error;
          }
      }

      // Account Methods
      async createTemporaryAccount(ipAddress: string): Promise<string> {
          const db = this._getDb();
          const now = new Date();
          const docRef = await db.collection('accounts').add({
              registered: false,
              created_on: now,
              accessed_on: now,
              created_from_ip: ipAddress,
              last_accessed_from_ip: ipAddress,
              account_type: 'guest',
          });
          return docRef.id;
      }

      async getAccounts(): Promise<Account[]> {
        const db = this._getDb();
        const snapshot = await db.collection('accounts').get();
        return snapshot.docs.map(toAccount);
    }

    async getAccountById(id: string): Promise<Account | null> {
        const db = this._getDb();
        try {
            const doc = await db.collection('accounts').doc(id).get();
            return doc.exists ? toAccount(doc) : null;
        } catch (error) {
            await logProblem(error, `getAccountById-firebase (ID: ${id})`);
            return null;
        }
    }

    async updateAccountAccess(accountId: string, ipAddress: string): Promise<void> {
        const db = this._getDb();
        try {
            const accountRef = db.collection('accounts').doc(accountId);
            await accountRef.update({
                accessed_on: new Date(),
                last_accessed_from_ip: ipAddress,
            });
        } catch (error) {
            await logProblem(error, `updateAccountAccess (ID: ${accountId})`);
            // Don't re-throw, as this is a background task
        }
    }
}
