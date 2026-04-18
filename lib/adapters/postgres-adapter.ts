
import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import type { Property, CreatePropertyInput, PropertyFilters, ExtractedPropertyData, UpdatePropertyInput, User, Agency, CreateAgencyInput, UpdateAgencyInput, TeamMember, CreateTeamMemberFormValues, UpdateTeamMemberFormValues, Requirement, CreateRequirementFormValues, Account, Agent, UpdateUserFormValues } from '@/types';
import type { DatabaseAdapter } from '@/lib/database';
import type { SavedPropertyEntry } from '@/services/property-service';
import { logProblem } from '@/services/problem-service';

export class PostgresAdapter implements DatabaseAdapter {
    private pool: Pool;
    private propertyColumnsPromise: Promise<Set<string>> | null = null;
    private accountColumnMapPromise: Promise<{
        createdOn: string;
        accessedOn: string;
        createdFromIp: string;
        lastAccessedFromIp: string;
        accountType: string;
    }> | null = null;
    private agentColumnsPromise: Promise<Set<string>> | null = null;

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

    private async ensurePropertySchema() {
        await this.query(`
            ALTER TABLE properties
            ADD COLUMN IF NOT EXISTS location TEXT,
            ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
            ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
            ADD COLUMN IF NOT EXISTS area DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS purpose TEXT,
            ADD COLUMN IF NOT EXISTS category TEXT,
            ADD COLUMN IF NOT EXISTS type TEXT,
            ADD COLUMN IF NOT EXISTS images JSONB,
            ADD COLUMN IF NOT EXISTS amenities JSONB,
            ADD COLUMN IF NOT EXISTS agency JSONB,
            ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN,
            ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
            ADD COLUMN IF NOT EXISTS slug TEXT,
            ADD COLUMN IF NOT EXISTS "listingAgent" TEXT,
            ADD COLUMN IF NOT EXISTS "isOwnerListing" BOOLEAN,
            ADD COLUMN IF NOT EXISTS "fetchHistory" JSONB,
            ADD COLUMN IF NOT EXISTS "imageFetchHistory" JSONB,
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
        `);

        await this.query(`CREATE INDEX IF NOT EXISTS idx_properties_source_url ON properties("sourceUrl")`);
        await this.query(`CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug)`);
    }

    private async getPropertyColumns() {
        await this.ensurePropertySchema();

        if (!this.propertyColumnsPromise) {
            this.propertyColumnsPromise = (async () => {
                const res = await this.query(
                    `
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'properties'
                    `
                );

                return new Set(res.rows.map((row) => String(row.column_name)));
            })();
        }

        return this.propertyColumnsPromise;
    }

    private parseStringArray(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value.map((item) => String(item)).filter(Boolean);
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.map((item) => String(item)).filter(Boolean);
                }
            } catch {
                return value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
            }
        }

        return [];
    }

    private parseObject(value: unknown): Record<string, unknown> | null {
        if (!value) {
            return null;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
        }

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed as Record<string, unknown>;
                }
            } catch {
                return null;
            }
        }

        return null;
    }

    private buildPropertyWriteValues(
        propertyData: Partial<CreatePropertyInput> & Record<string, unknown>,
        columns: Set<string>
    ) {
        const values: Record<string, unknown> = {};

        if (columns.has('title') && propertyData.title !== undefined) values.title = propertyData.title;
        if (columns.has('description') && propertyData.description !== undefined) values.description = propertyData.description;
        if (columns.has('price')) values.price = propertyData.price ?? null;
        if (columns.has('location')) values.location = propertyData.location ?? null;
        if (columns.has('bedrooms')) values.bedrooms = propertyData.bedrooms ?? 0;
        if (columns.has('bathrooms')) values.bathrooms = propertyData.bathrooms ?? 0;
        if (columns.has('area')) values.area = propertyData.area ?? 0;
        if (columns.has('purpose')) values.purpose = propertyData.purpose ?? null;
        if (columns.has('category')) values.category = propertyData.category ?? null;
        if (columns.has('type')) values.type = propertyData.type ?? null;
        if (columns.has('images')) values.images = JSON.stringify(propertyData.images ?? []);
        if (columns.has('amenities')) values.amenities = JSON.stringify(propertyData.amenities ?? []);
        if (columns.has('agency')) values.agency = JSON.stringify(propertyData.agency ?? {
            id: 'postgres-imported',
            name: 'Imported Listing',
            logoUrl: 'https://placehold.co/100x40.png',
        });
        if (columns.has('isFeatured')) values.isFeatured = propertyData.isFeatured ?? false;
        if (columns.has('isApproved')) values.isApproved = propertyData.isApproved ?? null;
        if (columns.has('status') && propertyData.status !== undefined) values.status = propertyData.status;
        if (columns.has('sourceUrl')) values.sourceUrl = propertyData.sourceUrl ?? null;
        if (columns.has('slug') && propertyData.slug !== undefined) values.slug = propertyData.slug;
        if (columns.has('listingAgent')) values.listingAgent = propertyData.listingAgent ?? null;
        if (columns.has('isOwnerListing')) values.isOwnerListing = propertyData.isOwnerListing ?? false;
        if (columns.has('fetchHistory')) values.fetchHistory = JSON.stringify(propertyData.fetchHistory ?? []);
        if (columns.has('imageFetchHistory')) values.imageFetchHistory = JSON.stringify(propertyData.imageFetchHistory ?? []);
        if (columns.has('latitude')) values.latitude = propertyData.latitude ?? null;
        if (columns.has('longitude')) values.longitude = propertyData.longitude ?? null;

        return values;
    }

    private async getAgentColumns() {
        if (!this.agentColumnsPromise) {
            this.agentColumnsPromise = (async () => {
                const res = await this.query(
                    `
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'agents'
                    `
                );

                return new Set(res.rows.map((row) => String(row.column_name)));
            })();
        }

        return this.agentColumnsPromise;
    }

    private parseAgentSpecializations(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value
                .map((item) => String(item).trim())
                .filter(Boolean);
        }

        if (typeof value === 'string') {
            return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    private mapAgentRow(row: any): Agent {
        return {
            id: row.id,
            name: row.name || 'Unnamed Agent',
            slug: row.slug || row.id,
            location: row.location || '',
            registered: typeof row.registered === 'boolean' ? row.registered : Boolean(row.userId),
            contact: {
                email: row.email || undefined,
                phone: row.phone || undefined,
            },
            userId: row.userId || undefined,
            photoUrl: row.photoUrl || row.avatarUrl || undefined,
            about: row.about || row.bio || undefined,
            specializations: this.parseAgentSpecializations(row.specializations),
            availability_hours: row.availability_hours || undefined,
            time_slot_duration: typeof row.time_slot_duration === 'number' ? row.time_slot_duration : undefined,
            unavailability: row.unavailability || undefined,
        };
    }

    private async getAgentSelectQuery() {
        const columns = await this.getAgentColumns();
        const availableColumns = [
            'id',
            'name',
            'email',
            'phone',
            'bio',
            'avatarUrl',
            'slug',
            'location',
            'registered',
            'userId',
            'about',
            'photoUrl',
            'specializations',
            'availability_hours',
            'time_slot_duration',
            'unavailability',
            'createdAt',
            'updatedAt',
        ].filter((column) => columns.has(column));

        if (availableColumns.length === 0) {
            return 'SELECT id FROM agents';
        }

        return `SELECT ${availableColumns.map((column) => `"${column}"`).join(', ')} FROM agents`;
    }

    private async getAgentOrderByClause() {
        const columns = await this.getAgentColumns();

        if (columns.has('updatedAt')) {
            return 'ORDER BY "updatedAt" DESC, id DESC';
        }

        if (columns.has('createdAt')) {
            return 'ORDER BY "createdAt" DESC, id DESC';
        }

        return 'ORDER BY id DESC';
    }

    private buildAgentWriteValues(agentData: any, columns: Set<string>) {
        const values: Record<string, unknown> = {};

        if (columns.has('name') && agentData.name !== undefined) values.name = agentData.name;
        if (columns.has('email')) values.email = agentData.contact?.email ?? agentData.email ?? null;
        if (columns.has('phone')) values.phone = agentData.contact?.phone ?? agentData.phone ?? null;
        if (columns.has('slug') && agentData.slug !== undefined) values.slug = agentData.slug;
        if (columns.has('location') && agentData.location !== undefined) values.location = agentData.location;
        if (columns.has('registered') && agentData.registered !== undefined) values.registered = agentData.registered;
        if (columns.has('userId')) values.userId = agentData.userId ?? null;
        if (columns.has('about')) values.about = agentData.about ?? null;
        if (columns.has('bio')) values.bio = agentData.about ?? agentData.bio ?? null;
        if (columns.has('photoUrl')) values.photoUrl = agentData.photoUrl ?? null;
        if (columns.has('avatarUrl')) values.avatarUrl = agentData.photoUrl ?? agentData.avatarUrl ?? null;
        if (columns.has('specializations')) values.specializations = agentData.specializations ?? [];
        if (columns.has('availability_hours')) values.availability_hours = agentData.availability_hours ?? null;
        if (columns.has('time_slot_duration')) values.time_slot_duration = agentData.time_slot_duration ?? null;
        if (columns.has('unavailability')) values.unavailability = agentData.unavailability ?? null;

        return values;
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
        const purpose: Property['purpose'] = row?.purpose || (textBlob.includes('rent') ? 'Rent' : 'Sale');

        let category: Property['category'] = row?.category || 'House';
        if (!row?.category) {
            if (textBlob.includes('land') || textBlob.includes('plot')) category = 'Land';
            else if (textBlob.includes('apartment')) category = 'Apartment';
            else if (textBlob.includes('flat')) category = 'Flat';
        }

        const parsedAgency = this.parseObject(row?.agency);
        const images = this.parseStringArray(row?.images);
        const amenities = this.parseStringArray(row?.amenities);
        const fetchHistory = Array.isArray(row?.fetchHistory)
            ? row.fetchHistory
            : (() => {
                if (typeof row?.fetchHistory === 'string') {
                    try {
                        const parsed = JSON.parse(row.fetchHistory);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                }
                return [];
            })();
        const imageFetchHistory = Array.isArray(row?.imageFetchHistory)
            ? row.imageFetchHistory
            : (() => {
                if (typeof row?.imageFetchHistory === 'string') {
                    try {
                        const parsed = JSON.parse(row.imageFetchHistory);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                }
                return [];
            })();

        return {
            id: row.id,
            title: row.title || 'Untitled Property',
            description: row.description || '',
            price: Number(row.price || 0),
            location: row.location || 'Nepal',
            bedrooms: Number(row.bedrooms || 0),
            bathrooms: Number(row.bathrooms || 0),
            area: Number(row.area || 0),
            purpose,
            category,
            type: row.type || 'Residential',
            images: images.length > 0 ? images : ['https://placehold.co/600x400.png'],
            amenities,
            agency: {
                id: typeof parsedAgency?.id === 'string' ? parsedAgency.id : 'postgres-migrated',
                name: typeof parsedAgency?.name === 'string' ? parsedAgency.name : 'NeupEstate',
                logoUrl: typeof parsedAgency?.logoUrl === 'string' ? parsedAgency.logoUrl : 'https://placehold.co/200x80.png',
            },
            listingAgent: row.listingAgent || undefined,
            isOwnerListing: typeof row.isOwnerListing === 'boolean' ? row.isOwnerListing : undefined,
            isFeatured: Boolean(row.isFeatured),
            isApproved: typeof row.isApproved === 'boolean' ? row.isApproved : row.status ? row.status === 'approved' : true,
            sourceUrl: row.sourceUrl || undefined,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
            updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
            fetchHistory,
            imageFetchHistory,
            latitude: row.latitude ?? undefined,
            longitude: row.longitude ?? undefined,
            slug: row.slug || row.id,
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
        const columns = await this.getPropertyColumns();
        const { isPropertyPage: _ignored, ...rest } = propertyData;
        const id = randomUUID();
        const now = new Date().toISOString();
        const values = this.buildPropertyWriteValues(
            {
                ...rest,
                isFeatured: false,
                isApproved: false,
                status: 'pending',
                agency: {
                    id: 'imported',
                    name: 'Imported Listing',
                    logoUrl: 'https://placehold.co/100x40.png',
                },
                slug: rest.slug ?? id,
            },
            columns
        );
        const insertValues: Record<string, unknown> = { ...values, id };

        if (columns.has('createdAt')) insertValues.createdAt = now;
        if (columns.has('updatedAt')) insertValues.updatedAt = now;

        const fieldNames = Object.keys(insertValues);
        const placeholders = fieldNames.map((_, index) => `$${index + 1}`).join(', ');
        const params = fieldNames.map((field) => insertValues[field]);

        await this.query(
            `INSERT INTO properties (${fieldNames.map((field) => `"${field}"`).join(', ')}) VALUES (${placeholders})`,
            params
        );

        return id;
    }

    async createProperty(propertyData: CreatePropertyInput): Promise<string> {
        const columns = await this.getPropertyColumns();
        const id = randomUUID();
        const now = new Date().toISOString();
        const values = this.buildPropertyWriteValues(
            {
                ...propertyData,
                isFeatured: false,
                isApproved: true,
                status: 'approved',
                agency: {
                    id: 'manual',
                    name: 'Manually Added',
                    logoUrl: 'https://placehold.co/100x40.png',
                },
                slug: propertyData.slug || id,
            },
            columns
        );
        const insertValues: Record<string, unknown> = { ...values, id };

        if (columns.has('createdAt')) insertValues.createdAt = now;
        if (columns.has('updatedAt')) insertValues.updatedAt = now;

        const fieldNames = Object.keys(insertValues);
        const placeholders = fieldNames.map((_, index) => `$${index + 1}`).join(', ');
        const params = fieldNames.map((field) => insertValues[field]);

        await this.query(
            `INSERT INTO properties (${fieldNames.map((field) => `"${field}"`).join(', ')}) VALUES (${placeholders})`,
            params
        );

        return id;
    }

    async updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void> {
        const columns = await this.getPropertyColumns();
        const values = this.buildPropertyWriteValues(propertyData, columns);
        if (columns.has('updatedAt')) {
            values.updatedAt = new Date().toISOString();
        }

        const fieldNames = Object.keys(values);
        if (fieldNames.length === 0) {
            return;
        }

        const params = [...fieldNames.map((field) => values[field]), id];
        const assignments = fieldNames
            .map((field, index) => `"${field}" = $${index + 1}`)
            .join(', ');

        await this.query(
            `UPDATE properties SET ${assignments} WHERE id = $${params.length}`,
            params
        );
    }

    async updatePropertyImages(id: string, images: string[]): Promise<void> {
        const columns = await this.getPropertyColumns();
        const values: Record<string, unknown> = {};

        if (columns.has('images')) {
            values.images = JSON.stringify(images);
        }
        if (columns.has('updatedAt')) {
            values.updatedAt = new Date().toISOString();
        }

        const fieldNames = Object.keys(values);
        if (fieldNames.length === 0) {
            return;
        }

        const params = [...fieldNames.map((field) => values[field]), id];
        const assignments = fieldNames
            .map((field, index) => `"${field}" = $${index + 1}`)
            .join(', ');

        await this.query(
            `UPDATE properties SET ${assignments} WHERE id = $${params.length}`,
            params
        );
    }

    async addFetchToHistory(propertyId: string, data: ExtractedPropertyData): Promise<void> {
        const property = await this.getPropertyById(propertyId);
        if (!property) {
            throw new Error('Property not found.');
        }

        const columns = await this.getPropertyColumns();
        if (!columns.has('fetchHistory')) {
            return;
        }

        const nextHistory = [
            { fetchedAt: new Date().toISOString(), data },
            ...(property.fetchHistory || []),
        ];

        await this.query(
            `UPDATE properties SET "fetchHistory" = $1, "updatedAt" = $2 WHERE id = $3`,
            [JSON.stringify(nextHistory), new Date().toISOString(), propertyId]
        );
    }

    async deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
        const property = await this.getPropertyById(propertyId);
        if (!property) {
            throw new Error('Property not found.');
        }

        const columns = await this.getPropertyColumns();
        if (!columns.has('fetchHistory')) {
            return;
        }

        const nextHistory = (property.fetchHistory || []).filter((item) => item.fetchedAt !== fetchedAt);
        await this.query(
            `UPDATE properties SET "fetchHistory" = $1, "updatedAt" = $2 WHERE id = $3`,
            [JSON.stringify(nextHistory), new Date().toISOString(), propertyId]
        );
    }

    async addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
        const property = await this.getPropertyById(propertyId);
        if (!property) {
            throw new Error('Property not found.');
        }

        const columns = await this.getPropertyColumns();
        if (!columns.has('imageFetchHistory')) {
            return;
        }

        const nextHistory = [
            { fetchedAt: new Date().toISOString(), images },
            ...(property.imageFetchHistory || []),
        ];

        await this.query(
            `UPDATE properties SET "imageFetchHistory" = $1, "updatedAt" = $2 WHERE id = $3`,
            [JSON.stringify(nextHistory), new Date().toISOString(), propertyId]
        );
    }

    async deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
        const property = await this.getPropertyById(propertyId);
        if (!property) {
            throw new Error('Property not found.');
        }

        const columns = await this.getPropertyColumns();
        if (!columns.has('imageFetchHistory')) {
            return;
        }

        const nextHistory = (property.imageFetchHistory || []).filter((item) => item.fetchedAt !== fetchedAt);
        await this.query(
            `UPDATE properties SET "imageFetchHistory" = $1, "updatedAt" = $2 WHERE id = $3`,
            [JSON.stringify(nextHistory), new Date().toISOString(), propertyId]
        );
    }

    async updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyData): Promise<void> {
        const columns = await this.getPropertyColumns();
        const { isPropertyPage: _ignored, ...rest } = propertyData;
        const values = this.buildPropertyWriteValues(rest, columns);
        if (columns.has('updatedAt')) {
            values.updatedAt = new Date().toISOString();
        }

        const fieldNames = Object.keys(values);
        if (fieldNames.length === 0) {
            return;
        }

        const params = [...fieldNames.map((field) => values[field]), id];
        const assignments = fieldNames
            .map((field, index) => `"${field}" = $${index + 1}`)
            .join(', ');

        await this.query(
            `UPDATE properties SET ${assignments} WHERE id = $${params.length}`,
            params
        );
    }

    async getProperties(): Promise<Property[]> {
        const res = await this.query('SELECT * FROM properties ORDER BY "updatedAt" DESC');
        return res.rows.map(row => this.mapPropertyRow(row));
    }

    async getPaginatedProperties(options: { page?: number; limit?: number; filters?: PropertyFilters; }): Promise<{ properties: Property[], totalCount: number }> {
        const columns = await this.getPropertyColumns();
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

        if (filters.sourceUrl) {
            if (!columns.has('sourceUrl')) {
                return { properties: [], totalCount: 0 };
            }
            params.push(filters.sourceUrl);
            where.push(`"sourceUrl" = $${params.length}`);
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
        const columns = await this.getPropertyColumns();
        if (columns.has('slug')) {
            const res = await this.query('SELECT * FROM properties WHERE slug = $1 LIMIT 1', [slug]);
            if (res.rows.length > 0) {
                return this.mapPropertyRow(res.rows[0]);
            }
        }

        return this.getPropertyById(slug);
    }

    async getPropertiesByAgent(agentId: string): Promise<Property[]> {
        throw new Error("Method not implemented.");
    }

    async approveProperty(propertyId: string): Promise<void> {
        const columns = await this.getPropertyColumns();
        const values: Record<string, unknown> = {};

        if (columns.has('status')) {
            values.status = 'approved';
        }
        if (columns.has('isApproved')) {
            values.isApproved = true;
        }
        if (columns.has('updatedAt')) {
            values.updatedAt = new Date().toISOString();
        }

        const fieldNames = Object.keys(values);
        if (fieldNames.length === 0) {
            return;
        }

        const params = [...fieldNames.map((field) => values[field]), propertyId];
        const assignments = fieldNames
            .map((field, index) => `"${field}" = $${index + 1}`)
            .join(', ');
        await this.query(`UPDATE properties SET ${assignments} WHERE id = $${params.length}`, params);
    }

    async deleteProperty(propertyId: string): Promise<void> {
        await this.query('DELETE FROM properties WHERE id = $1', [propertyId]);
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
        const columns = await this.getAgentColumns();
        const id = randomUUID();
        const now = new Date().toISOString();
        const values = this.buildAgentWriteValues(agentData, columns);
        const insertValues: Record<string, unknown> = { ...values };

        if (columns.has('id')) insertValues.id = id;
        if (columns.has('createdAt')) insertValues.createdAt = now;
        if (columns.has('updatedAt')) insertValues.updatedAt = now;

        const fieldNames = Object.keys(insertValues);
        const fieldList = fieldNames.map((field) => `"${field}"`).join(', ');
        const placeholders = fieldNames.map((_, index) => `$${index + 1}`).join(', ');
        const params = fieldNames.map((field) => insertValues[field]);

        await this.query(
            `INSERT INTO agents (${fieldList}) VALUES (${placeholders})`,
            params
        );

        return id;
    }

    async getAgents(options: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
        const limit = Math.max(1, options.limit ?? 20);
        const offset = Math.max(0, options.offset ?? 0);
        const selectQuery = await this.getAgentSelectQuery();
        const orderBy = await this.getAgentOrderByClause();
        const res = await this.query(
            `${selectQuery} ${orderBy} LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return res.rows.map((row) => this.mapAgentRow(row));
    }

    async getAgentById(id: string): Promise<Agent | null> {
        const selectQuery = await this.getAgentSelectQuery();
        const res = await this.query(
            `${selectQuery} WHERE id = $1 LIMIT $2`,
            [id, 1]
        );

        if (res.rows.length === 0) {
            return null;
        }

        return this.mapAgentRow(res.rows[0]);
    }

    async getAgentBySlug(slug: string): Promise<Agent | null> {
        const columns = await this.getAgentColumns();

        if (!columns.has('slug')) {
            return null;
        }

        const selectQuery = await this.getAgentSelectQuery();
        const res = await this.query(
            `${selectQuery} WHERE "slug" = $1 LIMIT $2`,
            [slug, 1]
        );

        if (res.rows.length === 0) {
            return null;
        }

        return this.mapAgentRow(res.rows[0]);
    }

    async updateAgent(id: string, agentData: any): Promise<void> {
        const columns = await this.getAgentColumns();
        const values = this.buildAgentWriteValues(agentData, columns);

        if (columns.has('updatedAt')) {
            values.updatedAt = new Date().toISOString();
        }

        const fieldNames = Object.keys(values);
        if (fieldNames.length === 0) {
            return;
        }

        const assignments = fieldNames
            .map((field, index) => `"${field}" = $${index + 1}`)
            .join(', ');
        const params = [...fieldNames.map((field) => values[field]), id];

        await this.query(
            `UPDATE agents SET ${assignments} WHERE id = $${params.length}`,
            params
        );
    }

    async deleteAgent(agentId: string): Promise<void> {
        await this.query('DELETE FROM agents WHERE id = $1', [agentId]);
    }

    async getAgentsByLocation(location: string): Promise<Agent[]> {
        const columns = await this.getAgentColumns();

        if (!columns.has('location')) {
            const agents = await this.getAgents({ limit: 1000, offset: 0 });
            return agents.filter((agent) => agent.location.toLowerCase().includes(location.toLowerCase()));
        }

        const selectQuery = await this.getAgentSelectQuery();
        const orderBy = await this.getAgentOrderByClause();
        const res = await this.query(
            `${selectQuery} WHERE "location" ILIKE $1 ${orderBy}`,
            [`%${location}%`]
        );

        return res.rows.map((row) => this.mapAgentRow(row));
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
