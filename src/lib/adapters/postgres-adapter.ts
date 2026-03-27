
import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData, UpdatePropertyInput, User, Agency, CreateAgencyInput, UpdateAgencyInput, TeamMember, CreateTeamMemberFormValues, UpdateTeamMemberFormValues, Requirement, CreateRequirementFormValues, Account, Agent, UpdateUserFormValues } from '@/types';
import type { DatabaseAdapter } from '../database';
import type { SavedPropertyEntry } from '@/services/property-service';
import { logProblem } from '@/services/problem-service';

export class PostgresAdapter implements DatabaseAdapter {
    private pool: Pool;
    private accountColumnMapPromise: Promise<{
        createdOn: string;
        accessedOn: string;
        createdFromIp: string;
        lastAccessedFromIp: string;
        accountType: string;
    }> | null = null;

    constructor() {
        const connectionString = process.env.POSTGRES_URI || process.env.POSTGRES_URL || process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error("POSTGRES_URI is not configured in .env file.");
        }
        // POSTGRES_URI format: postgres://user:password@host:port/database
        this.pool = new Pool({
            connectionString,
        });
    }

    private async query(text: string, params?: any[]) {
        return this.pool.query(text, params);
    }

    private async getAccountColumnMap() {
        if (!this.accountColumnMapPromise) {
            this.accountColumnMapPromise = (async () => {
                const res = await this.query(
                    `
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'accounts'
                    `
                );

                const columns = new Set(res.rows.map((row) => String(row.column_name)));
                const pick = (camelCase: string, snakeCase: string) => {
                    if (columns.has(camelCase)) return `"${camelCase}"`;
                    if (columns.has(snakeCase)) return snakeCase;
                    return `"${camelCase}"`;
                };

                return {
                    createdOn: pick('createdOn', 'created_on'),
                    accessedOn: pick('accessedOn', 'accessed_on'),
                    createdFromIp: pick('createdFromIp', 'created_from_ip'),
                    lastAccessedFromIp: pick('lastAccessedFromIp', 'last_accessed_from_ip'),
                    accountType: pick('accountType', 'account_type'),
                };
            })();
        }

        return this.accountColumnMapPromise;
    }

    private async ensureSavedPropertiesTable(): Promise<void> {
        await this.query(`
            CREATE TABLE IF NOT EXISTS user_saved_properties (
                user_id TEXT NOT NULL,
                property_id TEXT NOT NULL,
                property_title TEXT,
                saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (user_id, property_id)
            )
        `);
        await this.query('CREATE INDEX IF NOT EXISTS idx_user_saved_properties_saved_at ON user_saved_properties(saved_at DESC)');
        await this.query('CREATE INDEX IF NOT EXISTS idx_user_saved_properties_property_id ON user_saved_properties(property_id)');
    }

    private mapPropertyRow(row: any): Property {
        const textBlob = `${row?.title || ''} ${row?.description || ''}`.toLowerCase();
        const purpose: Property['purpose'] = textBlob.includes('rent') ? 'Rent' : 'Sale';

        let category: Property['category'] = 'House';
        if (textBlob.includes('land') || textBlob.includes('plot')) category = 'Land';
        else if (textBlob.includes('apartment')) category = 'Apartment';
        else if (textBlob.includes('flat')) category = 'Flat';

        return {
            id: row.id,
            title: row.title || 'Untitled Property',
            description: row.description || '',
            price: Number(row.price || 0),
            location: 'Nepal',
            bedrooms: 0,
            bathrooms: 0,
            area: 0,
            purpose,
            category,
            type: 'Residential',
            images: ['https://placehold.co/600x400.png'],
            amenities: [],
            agency: {
                id: 'postgres-migrated',
                name: 'NeupEstate',
                logoUrl: 'https://placehold.co/200x80.png',
            },
            isFeatured: Boolean(row.isFeatured),
            isApproved: row.status ? row.status === 'approved' : true,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
            updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
            slug: row.id,
        };
    }

    private mapAgencyRow(row: any): Agency {
        return {
            id: row.id,
            name: row.name || 'Unnamed Agency',
            logoUrl: row.logoUrl || 'https://placehold.co/200x80.png',
            website: row.website || undefined,
            contactEmail: row.contactEmail || undefined,
            contactPhone: row.contactPhone || undefined,
        };
    }

    private mapAccountRowToUser(row: any): User {
        const rawName = typeof row.name === 'string' ? row.name.trim() : '';
        const rawLastLogin = row.accessed_on ?? row.accessedOn;

        return {
            id: row.id,
            name: rawName || 'Registered User',
            email: [],
            phone: [],
            location: row.location || undefined,
            role: 'User',
            lastLogin: rawLastLogin ? new Date(rawLastLogin).toISOString() : undefined,
            avatarUrl: undefined,
        };
    }

    // --- Property Methods ---

    async addProperty(propertyData: Omit<ExtractedPropertyData, 'embedding'>): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async createProperty(propertyData: CreatePropertyInput): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async updatePropertyImages(id: string, images: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async addFetchToHistory(propertyId: string, data: ExtractedPropertyData): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyData): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async getProperties(): Promise<Property[]> {
        const res = await this.query('SELECT * FROM properties ORDER BY "updatedAt" DESC');
        return res.rows.map(row => this.mapPropertyRow(row));
    }

    async getPaginatedProperties(options: { page?: number; limit?: number; filters?: PropertyFilters; }): Promise<{ properties: Property[], totalCount: number }> {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.max(1, options.limit ?? 20);
        const offset = (page - 1) * limit;
        const filters = options.filters ?? {};

        const where: string[] = [];
        const params: any[] = [];

        if (filters.id) {
            params.push(filters.id);
            where.push(`id = $${params.length}`);
        }

        if (filters.status) {
            params.push(filters.status);
            where.push(`status = $${params.length}`);
        }

        const searchTerm = filters.searchTerm?.trim();
        if (searchTerm) {
            params.push(`%${searchTerm}%`);
            const searchParam = `$${params.length}`;
            where.push(`(title ILIKE ${searchParam} OR description ILIKE ${searchParam})`);
        }

        const minPrice = Number.isFinite(filters.minPrice) ? filters.minPrice : undefined;
        if (minPrice !== undefined) {
            params.push(minPrice);
            where.push(`price >= $${params.length}`);
        }

        const maxPrice = Number.isFinite(filters.maxPrice) ? filters.maxPrice : undefined;
        if (maxPrice !== undefined) {
            params.push(maxPrice);
            where.push(`price <= $${params.length}`);
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const countResult = await this.query(
            `SELECT COUNT(*)::int AS count FROM properties ${whereClause}`,
            params
        );

        const countRow = countResult.rows[0] as { count?: number | string } | undefined;
        const totalCount = Number(countRow?.count ?? 0);

        const listParams = [...params, limit, offset];
        const listResult = await this.query(
            `
                SELECT *
                FROM properties
                ${whereClause}
                ORDER BY id DESC
                LIMIT $${listParams.length - 1}
                OFFSET $${listParams.length}
            `,
            listParams
        );

        return {
            properties: listResult.rows.map((row) => this.mapPropertyRow(row)),
            totalCount,
        };
    }

    async getFeaturedProperties(limit: number): Promise<Property[]> {
        const featured = await this.query(
            'SELECT * FROM properties WHERE "isFeatured" = true ORDER BY "updatedAt" DESC LIMIT $1',
            [limit]
        );

        if (featured.rows.length > 0) {
            return featured.rows.map(row => this.mapPropertyRow(row));
        }

        const fallback = await this.query(
            'SELECT * FROM properties ORDER BY "updatedAt" DESC LIMIT $1',
            [limit]
        );
        return fallback.rows.map(row => this.mapPropertyRow(row));
    }

    async getRecentProperties(limit: number): Promise<Property[]> {
        const res = await this.query(
            'SELECT * FROM properties ORDER BY "createdAt" DESC LIMIT $1',
            [limit]
        );
        return res.rows.map(row => this.mapPropertyRow(row));
    }

    async getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit: number): Promise<Property[]> {
        const res = await this.query(
            'SELECT * FROM properties ORDER BY "updatedAt" DESC LIMIT $1',
            [limit]
        );
        const normalized = purpose.toLowerCase();
        return res.rows
            .map(row => this.mapPropertyRow(row))
            .filter(property => property.purpose.toLowerCase() === normalized);
    }

    async getFeaturedProjects(limit: number): Promise<Property[]> {
        return this.getFeaturedProperties(limit);
    }

    async getPremiumProperties(limit: number): Promise<Property[]> {
        const res = await this.query(
            'SELECT * FROM properties WHERE price IS NOT NULL ORDER BY price DESC LIMIT $1',
            [limit]
        );
        return res.rows.map(row => this.mapPropertyRow(row));
    }

    async getLuxuriousProperties(limit: number): Promise<Property[]> {
        return this.getPremiumProperties(limit);
    }

    async getPendingProperties(limit: number): Promise<Property[]> {
        const res = await this.query(
            'SELECT * FROM properties WHERE status = $1 ORDER BY "updatedAt" DESC LIMIT $2',
            ['pending', limit]
        );
        return res.rows.map(row => this.mapPropertyRow(row));
    }

    async getPropertyById(id: string): Promise<Property | null> {
        const res = await this.query('SELECT * FROM properties WHERE id = $1 LIMIT 1', [id]);
        if (res.rows.length === 0) return null;
        return this.mapPropertyRow(res.rows[0]);
    }

    async getPropertyBySlug(slug: string): Promise<Property | null> {
        // Current Postgres schema does not store slug, so fall back to ID-based lookup.
        return this.getPropertyById(slug);
    }

    async getPropertiesByAgent(agentId: string): Promise<Property[]> {
        throw new Error("Method not implemented.");
    }

    async approveProperty(propertyId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async deleteProperty(propertyId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
        await this.ensureSavedPropertiesTable();
        const res = await this.query(
            'SELECT 1 FROM user_saved_properties WHERE user_id = $1 AND property_id = $2 LIMIT 1',
            [userId, propertyId]
        );
        return res.rows.length > 0;
    }

    async toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
        await this.ensureSavedPropertiesTable();
        const currentlySaved = await this.isPropertySaved(userId, propertyId);

        if (currentlySaved) {
            await this.query(
                'DELETE FROM user_saved_properties WHERE user_id = $1 AND property_id = $2',
                [userId, propertyId]
            );
            return { saved: false };
        }

        const propertyRes = await this.query('SELECT title FROM properties WHERE id = $1 LIMIT 1', [propertyId]);
        const propertyTitle = propertyRes.rows[0]?.title || 'Property';

        await this.query(
            `
                INSERT INTO user_saved_properties (user_id, property_id, property_title, saved_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, property_id)
                DO UPDATE SET property_title = EXCLUDED.property_title, saved_at = NOW()
            `,
            [userId, propertyId, propertyTitle]
        );

        return { saved: true };
    }

    async getSavedProperties(userId: string): Promise<Property[]> {
        await this.ensureSavedPropertiesTable();
        const res = await this.query(
            `
                SELECT p.*
                FROM user_saved_properties usp
                INNER JOIN properties p ON p.id = usp.property_id
                WHERE usp.user_id = $1
                ORDER BY usp.saved_at DESC
            `,
            [userId]
        );
        return res.rows.map(row => this.mapPropertyRow(row));
    }

    async getLatestSavedProperties(limit: number): Promise<SavedPropertyEntry[]> {
        await this.ensureSavedPropertiesTable();
        const res = await this.query(
            `
                SELECT
                    usp.user_id,
                    COALESCE(a.name, 'Unknown User') AS user_name,
                    usp.property_id,
                    COALESCE(usp.property_title, p.title, 'Unknown Property') AS property_title,
                    usp.saved_at
                FROM user_saved_properties usp
                LEFT JOIN accounts a ON a.id = usp.user_id
                LEFT JOIN properties p ON p.id = usp.property_id
                ORDER BY usp.saved_at DESC
                LIMIT $1
            `,
            [limit]
        );

        return res.rows.map(row => ({
            userId: row.user_id,
            userName: row.user_name,
            propertyId: row.property_id,
            propertyTitle: row.property_title,
            savedAt: new Date(row.saved_at).toISOString(),
        }));
    }

    async getUsersBySavedProperty(propertyId: string): Promise<User[]> {
        await this.ensureSavedPropertiesTable();
        const res = await this.query(
            `
                SELECT a.*
                FROM user_saved_properties usp
                INNER JOIN accounts a ON a.id = usp.user_id
                WHERE usp.property_id = $1
                ORDER BY usp.saved_at DESC
            `,
            [propertyId]
        );
        return res.rows.map(row => this.mapAccountRowToUser(row));
    }

    // --- User Methods ---
    async getUsers(): Promise<User[]> {
        const accountColumns = await this.getAccountColumnMap();
        const res = await this.query(
            `
                SELECT
                    id,
                    name,
                    location,
                    ${accountColumns.accessedOn} AS accessed_on,
                    registered,
                    ${accountColumns.accountType} AS account_type
                FROM accounts
                WHERE registered = true
                  AND ${accountColumns.accountType} <> 'guest'
                ORDER BY accessed_on DESC NULLS LAST, name ASC NULLS LAST, id ASC
            `
        );

        return res.rows.map((row) => this.mapAccountRowToUser(row));
    }

    async updateUser(id: string, data: UpdateUserFormValues): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // --- Agency Methods ---
    async createAgency(agencyData: CreateAgencyInput): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async getAgencies(options: { limit?: number; offset?: number }): Promise<Agency[]> {
        const limit = options?.limit ?? 20;
        const offset = options?.offset ?? 0;
        const res = await this.query(
            'SELECT * FROM agencies ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return res.rows.map(row => this.mapAgencyRow(row));
    }

    async getFeaturedAgencies(limit: number): Promise<Agency[]> {
        const res = await this.query(
            'SELECT * FROM agencies ORDER BY "createdAt" DESC LIMIT $1',
            [limit]
        );
        return res.rows.map(row => this.mapAgencyRow(row));
    }

    async getAgencyById(id: string): Promise<Agency | null> {
        throw new Error("Method not implemented.");
    }

    async updateAgency(id: string, agencyData: UpdateAgencyInput): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async deleteAgency(agencyId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // --- Agent Methods ---
    async createAgent(agentData: any): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async getAgents(options: { limit?: number; offset?: number }): Promise<Agent[]> {
        throw new Error("Method not implemented.");
    }

    async getAgentById(id: string): Promise<Agent | null> {
        throw new Error("Method not implemented.");
    }

    async getAgentBySlug(slug: string): Promise<Agent | null> {
        throw new Error("Method not implemented.");
    }

    async updateAgent(id: string, agentData: any): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async deleteAgent(agentId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async getAgentsByLocation(location: string): Promise<Agent[]> {
        throw new Error("Method not implemented.");
    }

    // --- Team Member Methods ---
    async createTeamMember(memberData: CreateTeamMemberFormValues): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async getTeamMembers(options: { limit?: number; offset?: number }): Promise<TeamMember[]> {
        throw new Error("Method not implemented.");
    }

    async getTeamMemberById(id: string): Promise<TeamMember | null> {
        throw new Error("Method not implemented.");
    }

    async getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
        throw new Error("Method not implemented.");
    }

    async updateTeamMember(id: string, memberData: UpdateTeamMemberFormValues): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async deleteTeamMember(memberId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // --- Requirement Methods ---
    async createRequirement(data: CreateRequirementFormValues): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async getRequirementById(id: string): Promise<Requirement | null> {
        throw new Error("Method not implemented.");
    }

    async getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
        throw new Error("Method not implemented.");
    }

    async updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void> {
        throw new Error("Method not implemented.");
    }

    // --- Account Methods ---
    async createTemporaryAccount(ipAddress: string): Promise<string> {
        const accountColumns = await this.getAccountColumnMap();
        const id = randomUUID();
        const now = new Date().toISOString();
        const query = `
            INSERT INTO accounts (id, ${accountColumns.createdOn}, ${accountColumns.accessedOn}, ${accountColumns.createdFromIp}, ${accountColumns.lastAccessedFromIp}, registered, ${accountColumns.accountType}) 
            VALUES ($1, $2, $2, $3, $3, false, 'guest') 
            RETURNING id
        `;
        const res = await this.query(query, [id, now, ipAddress]);
        return res.rows[0].id;
    }

    async getAccounts(): Promise<Account[]> {
        const accountColumns = await this.getAccountColumnMap();
        const query = `
            SELECT
                id,
                ${accountColumns.createdOn} AS created_on,
                ${accountColumns.accessedOn} AS accessed_on,
                ${accountColumns.createdFromIp} AS created_from_ip,
                ${accountColumns.lastAccessedFromIp} AS last_accessed_from_ip,
                registered,
                ${accountColumns.accountType} AS account_type,
                name,
                location
            FROM accounts
        `;
        const res = await this.query(query);
        return res.rows.map(row => ({
            id: row.id,
            created_on: row.created_on,
            accessed_on: row.accessed_on,
            created_from_ip: row.created_from_ip,
            last_accessed_from_ip: row.last_accessed_from_ip,
            registered: row.registered,
            account_type: row.account_type as any,
            name: row.name || undefined,
            location: row.location || undefined,
        }));
    }

    async getAccountById(id: string): Promise<Account | null> {
        const accountColumns = await this.getAccountColumnMap();
        const query = `
            SELECT
                id,
                ${accountColumns.createdOn} AS created_on,
                ${accountColumns.accessedOn} AS accessed_on,
                ${accountColumns.createdFromIp} AS created_from_ip,
                ${accountColumns.lastAccessedFromIp} AS last_accessed_from_ip,
                registered,
                ${accountColumns.accountType} AS account_type,
                name,
                location
            FROM accounts
            WHERE id = $1
        `;
        const res = await this.query(query, [id]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
            id: row.id,
            created_on: row.created_on,
            accessed_on: row.accessed_on,
            created_from_ip: row.created_from_ip,
            last_accessed_from_ip: row.last_accessed_from_ip,
            registered: row.registered,
            account_type: row.account_type as any,
            name: row.name || undefined,
            location: row.location || undefined,
        };
    }

    async updateAccountAccess(accountId: string, ipAddress: string): Promise<void> {
        const accountColumns = await this.getAccountColumnMap();
        const now = new Date().toISOString();
        const query = `UPDATE accounts SET ${accountColumns.accessedOn} = $1, ${accountColumns.lastAccessedFromIp} = $2 WHERE id = $3`;
        await this.query(query, [now, ipAddress, accountId]);
    }
}
