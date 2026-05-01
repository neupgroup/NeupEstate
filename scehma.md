# Database Schema (Prisma)

PostgreSQL database configured via `DATABASE_URL`.

## account (Account)
- id: String (primary key — cuid for registered, track.id format for unregistered)
- accountType: String
- mainId: String?
- registered: Boolean (default false)
- name: String?
- location: String?
- createdOn: DateTime (default now)
- accessedOn: DateTime (default now)
- createdFromIp: String?
- lastAccessedFromIp: String?

## activity (Activity)
- id: String (cuid, primary key)
- trackerId: String (references Account.id, indexed)
- title: String
- details: Json [duration:timeSpentOnThatPage, onPage:url, property:ifPropertyTheIdOfProperty]
- activityOn: DateTime (default now)
- ipAddress: String

## location (Location) -> make this table.
- id: String (cuid)
- name: String
- type: String (country/province/region/district/state/city/locality)
- parentId: String? (references Location.id)

## property (Property)
- id: String (cuid, primary key)
- slug: String (unique)
- title: String (varchar 255)
- description: String (Text)
- coverImage: String (varchar 255)
- type: Enum (HOUSE, APARTMENT, LAND, COMMERCIAL)
- purpose: Enum (SALE, RENT, LEASE)
- status: Enum (PENDING, ACTIVE, SOLD, RENTED, ARCHIVED) (default PENDING)
- currency: String (varchar 10)
- displayPrice: Decimal (18,2)
- displayPriceUnit: String (varchar 24)
- areaUnit: String (varchar 64)
- locationText: String (varchar 255) -> drop this field.
- geoLocation: String (varchar 63)
- structuredLocation: String -> change field name to location, references Location.id
- agency: String? (references Agency.id)
- agent: String? (references Agent.id)
- pricing: Json?
- roadAccessDetails: Json?
- distancing: Json?
- earnings: Json?
- landDetails: Json?
- plots: Json?
- apartmentDetails: Json?
- metaTags: String[] (default [])
- amenities: String[] (default [])
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)
- isFeatured: Boolean (default false)
- isApproved: Boolean (default false)
- isDeleted: Boolean (default false)
- customId: String?

## property_link (PropertyLink)
- id: String (cuid, primary key)
- primaryId: String (references Property.id)
- secondaryId: String (references Property.id)

## property_media (PropertyMedia)
- id: String (cuid, primary key)
- propertyId: String (references Property.id, indexed)
- type: String (video/audio/photo/gif)
- url: String (varchar 500)
- alt: String (varchar 255)
- sortOrder: Int (default 0)
- isPrimary: Boolean (default false)
- createdAt: DateTime (default now)
- isDeleted: Boolean (default false)

## property_house_detail (PropertyHouseDetail)
- propertyId: String (cuid, primary key, unique, references Property.id)
- bedrooms: Int
- bathrooms: Int
- floors: Int
- kitchens: Int
- livingRooms: Int
- diningRooms: Int
- carParkingSpots: Int
- bikeParkingSpots: Int
- furnished: Boolean
- buildYear: Int
- area: Decimal (12,2)
- facing: String (varchar 50)
- roadAccess: Decimal (8,2)

## property_apartment_detail (PropertyApartmentDetail)
- propertyId: String (cuid, primary key, unique, references Property.id)
- bedrooms: Int
- bathrooms: Int
- onFloor: Int
- totalFloors: Int
- balconies: Int
- lifts: Int
- carParkingSpots: Int
- bikeParkingSpots: Int
- furnished: Boolean
- blockName: String (varchar 100)
- unitNumber: String (varchar 100)
- superArea: Decimal (12,2)
- builtUpArea: Decimal (12,2)
- maintenanceFee: Decimal (18,2)

## property_land_detail (PropertyLandDetail)
- propertyId: String (cuid, primary key, unique, references Property.id)
- area: Decimal (12,2)
- facing: String (varchar 50)
- roadAccess: Decimal (8,2)
- plotShape: String (varchar 100)
- cornerPlot: Boolean
- waterAvailable: Boolean
- electricityAvailable: Boolean
- boundaryWall: Boolean

## property_commercial_detail (PropertyCommercialDetail)
- propertyId: String (cuid, primary key, unique, references Property.id)
- floor: Int
- washrooms: Int
- parkingSpots: Int
- frontage: Decimal (12,2)
- usableArea: Decimal (12,2)
- buildingType: String (varchar 100)

## property_price (PropertyPrice)
- id: String (cuid, primary key)
- propertyId: String (references Property.id, indexed)
- for: String
- currency: String (varchar 10)
- unit: String
- price: Decimal (18,2)
- priceUnit: String (varchar 24)

## property_fetch_history (PropertyFetchHistory)
- id: String (cuid, primary key)
- propertyId: String (references Property.id, indexed)
- sourceUrl: String?
- fetchedAt: DateTime (default now, indexed)
- type: String (default "data") (data/images)
- data: Json?
- images: String[] (default [])

## property_owner (PropertyOwner)
- id: String (cuid, primary key)
- propertyId: String (references Property.id, indexed)
- ownerType: String (registered/unregistered)
- userId: String?
- unregisteredName: String?
- unregisteredEmail: String?
- unregisteredPhones: Json?
- unregisteredNotes: String?
- sortOrder: Int (default 0)

## property_document (PropertyDocument)
- id: String (cuid, primary key)
- propertyId: String (references Property.id, indexed)
- name: String
- urls: Json
- sortOrder: Int (default 0)

## property_change (PropertyChange)
- id: String (cuid, primary key)
- propertyId: String (references Property.id, indexed)
- data: Json
- modifiedOn: DateTime (default now, indexed)

## agencies (Agency) -> change to agency (Agency)
- id: String (cuid, primary key)
- name: String (indexed)
- logoUrl: String?
- registeredName: String?
- contactEmail: String?
- contactPhone: String?
- mainLocation: String?
- branches: String[] (default [])
- description: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## agency_branch (AgencyBranch) -> make this table.
- id: String (cuid)
- agencyId: String (references Agency.id)
- name: String
- location: String (references Location.id)
- contactEmail: String?
- contactPhone: String?
- description: String?
- order: Int (default 0)

## agents (Agent) -> change to agent (Agent)
- id: String (cuid, primary key)
- name: String
- slug: String? (unique, indexed)
- location: String?
- registered: Boolean (default false)
- userId: String?
- email: String?
- phone: String?
- about: String?
- photoUrl: String?
- specializations: String[] (default [])
- availabilityHours: String? -> drop this field
- timeSlotDuration: Int? -> drop this field
- unavailability: Json? -> drop this field
- agencyId: String? (references Agency.id, indexed)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## review (Review)
- id: String (cuid, primary key)
- reviewedBy: String (references Account.id, indexed)
- rating: Int
- review: String (varchar 255)
- reviewedOn: DateTime
- response: String? (varchar 255)
- responseBy: String?
- responseOn: DateTime?

## requirements (Requirement) -> change to requirement (Requirement)
- id: String (cuid, primary key)
- userId: String (indexed)
- minBudget: Int?
- maxBudget: Int?
- location: String?
- propertyType: String[] (default [])
- purpose: String?
- urgency: String?
- requiredTime: String?
- paymentMethod: String[] (default [])
- loan: Boolean (default false)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## saved_property (SavedProperty)
- id: String (cuid, primary key)
- accountId: String (references Account.id, indexed)
- propertyId: String (references Property.id, indexed)
- savedAt: DateTime (default now)

## reacted_properties (ReactedProperty) -> change map to reacted_property
- id: String (cuid, primary key)
- trackedId: String (references Account.id, indexed)
- propertyId: String (references Property.id, indexed)
- onType: String
- reaction: Enum (Liked/Disliked/Reported)
- reactedAt: DateTime (default now)

## property_views (PropertyView) -> change map to property_view
- id: String (cuid, primary key)
- accountId: String (references Account.id, indexed)
- propertyId: String (references Property.id, indexed)
- onType: String
- viewedAt: DateTime (default now)
- timeViewed: Int (time in milliseconds)
- viewedOn: String (homepage/feed/propertyPage/ad)

## client (CrmClient)
- id: String (cuid, primary key)
- firstName: String (indexed by lastName)
- lastName: String
- contact: Json
- source: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## client_link (ClientLink)
- id: String (cuid, primary key)
- trackerId: String (indexed)
- clientId: String (references CrmClient.id, indexed)

## client_lead (ClientLead)
- id: String (cuid, primary key)
- clientId: String (references CrmClient.id, indexed)
- type: Enum (BUYER/SELLER/TENANT/LANDLORD, indexed)
- requirement: Json?
- priority: Enum (LOW/MEDIUM/HIGH/URGENT, default MEDIUM, indexed)
- leadOwner: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## lead_activity (LeadActivity)
- id: String (cuid, primary key)
- leadId: String (references ClientLead.id, indexed)
- data: Json
- activityOn: DateTime (default now, indexed)
- activityBy: String (indexed)

## conversations (Conversation)
- id: String (cuid, primary key)
- accountId: String? (indexed)
- customerName: String
- customerPhone: String
- customerEmail: String?
- customerAvatarUrl: String?
- notes: String?
- assignedTo: String (default "AI Assistant")
- subject: String
- lastMessageAt: DateTime (default now, indexed)
- lastMessageSnippet: String?
- lastMessageSender: String (default "agent")
- isRead: Boolean (default true)
- leadCategory: String (default "New Inquiry")
- leadScore: Int (default 5)
- aiInterventionActive: Boolean (default true)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## messages (Message)
- id: String (cuid, primary key)
- conversationId: String (references Conversation.id, indexed)
- sender: String
- text: String
- timestamp: DateTime (default now)

## site_content (SiteContent)
- id: String (cuid, primary key)
- key: String (unique)
- value: String
- section: String? (indexed)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## user_preferences (UserPreference) -> change to preferences (Preference)
- id: String (cuid, primary key)
- accountId: String (unique, references Account.id)
- updatedAt: DateTime (auto)
- preferences: Json (default "{}")
- totalViews: Int (default 0)
- totalSaves: Int (default 0)
- totalCalls: Int (default 0)
- totalInquiries: Int (default 0)
- totalVisitRequests: Int (default 0)
- totalMortgageRequests: Int (default 0)
- totalShares: Int (default 0)
- totalTimeSpentInSeconds: Int (default 0)

## property_requests (PropertyRequest)
- id: String (cuid, primary key)
- name: String
- email: String
- phone: String?
- location: String?
- propertyType: String?
- bedrooms: Int?
- bathrooms: Int?
- budget: Int?
- remarks: String?
- status: String (default "new")
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## mortgage_requests (MortgageRequest)
- id: String (cuid, primary key)
- name: String
- email: String
- phone: String
- address: String
- age: Int
- income: Int
- moreDetails: String?
- contactMethods: String[] (default [])
- status: String (default "new")
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## sales_requests (SalesRequest)
- id: String (cuid, primary key)
- name: String
- email: String
- phone: String
- propertyLocation: String
- propertyType: String
- remarks: String?
- status: String (default "new")
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## visit_requests (VisitRequest)
- id: String (cuid, primary key)
- propertyId: String (indexed)
- propertyTitle: String
- agentId: String (indexed)
- agentName: String
- name: String
- email: String
- phone: String?
- preferredDate: String
- preferredTime: String?
- status: String (default "new")
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## problems (Problem)
- id: String (cuid, primary key)
- context: String
- message: String
- stack: String?
- details: Json?
- createdAt: DateTime (default now)

## sitemaps (SitemapEntry)
- id: String (cuid, primary key)
- url: String (unique)
- priority: Float (default 0.5)
- frequency: String (default "weekly")
- lastmod: DateTime?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## ai_models (AIModel)
- id: String (cuid, primary key)
- modelId: String
- name: String
- description: String?
- costPerMillionInputTokens: Float (default 0)
- costPerMillionOutputTokens: Float (default 0)
- isDefault: Boolean (default false)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## prompts (Prompt)
- id: String (primary key)
- promptText: String
- description: String
- name: String
- placeholders: String[] (default [])
- model: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## whatsapp_config (WhatsAppConfig) -> drop this table.
- id: String
- apiToken: String?
- phoneNumberId: String?
- accountId: String?
- webhookVerifyToken: String?
- updatedAt: DateTime (auto)

## whatsapp_templates (WhatsAppTemplate) -> drop this table.
- id: String (cuid, primary key)
- name: String
- category: String
- language: String
- body: String
- status: String
- isPreapproved: Boolean (default false)
- createdAt: DateTime (default now)

## contact_submissions (ContactSubmission) -> change to contact_submission (ContactSubmission)
- id: String (cuid, primary key)
- name: String
- email: String
- phone: String?
- subject: String
- body: String
- status: String (default "new")
- createdAt: DateTime (default now)

## inquiries (Inquiry) -> change to inquiry (Inquiry)
- id: String (cuid, primary key)
- propertyId: String (indexed)
- propertyTitle: String
- agentName: String?
- name: String
- email: String
- phone: String?
- question: String
- status: String (default "new")
- createdAt: DateTime (default now)

## team_members (TeamMember)
- id: String (cuid, primary key)
- orgId: String?
- userId: String?
- name: String
- slug: String? (unique)
- position: String
- socialMedia: Json?
- about: String
- moreDetails: String?
- photoUrl: String?
- registered: Boolean (default false)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## faqs (FAQ)
- id: String (cuid, primary key)
- question: String
- answer: String
- category: String (default "General")
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## newsletter_subscriptions (NewsletterSubscription) -> drop table.
- id: String (cuid, primary key)
- email: String (unique)
- createdAt: DateTime (default now)

## account_role (AccountRole) -> make this table.
- id: String (cuid)
- name: String (unique)
- description: String
- permissions: String[] (default [])
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## account_access (AccountAccess) -> make this table.
- id: String (cuid)
- accountId: String (references Account.id)
- assetType: String
- assetId: String?
- roleId: String (references AccountRole.id)
