# Database Schema (Prisma)

PostgreSQL database configured via `DATABASE_URL`.

## account (Account)
- id: String (cuid) (logged in -> just id, not logged in -> track.id will be the id format)
- accountType: String
- mainId: String (references -> Account.id)
- lastActiveOn: Timestamp

## activity (Activity)
- id: String (cuid)
- trackerId: String (cuid) -> references -> trackerAccount (id)
- title: String
- details: JSON [duration:timeSpentOnThatPage, onPage:url, property:ifPropertyTheIdOfProperty]
- activityOn: DATETIME (default)
- ipAddress: String

## property (Property)
- id: String (cuid, primary key)
- slug: String (unique)
- title: String (varchar 255)
- description: Text
- coverImage: String (varchar 255)
- type: Enum (HOUSE, APARTMENT, LAND, COMMERCIAL)
- purpose: Enum (SALE, RENT, LEASE)
- status: Enum (PENDING, ACTIVE, SOLD, RENTED, ARCHIVED)
- currency: String (varchar 10)
- displayPrice: Decimal(18,2)
- displayPriceUnit: String (varchar 24)
- areaUnit: String (varchar 64)
- locationText: String (varchar 255)
- geoLocation: String (varchar 63)
- structuredLocation: String (location > location > location)
- agency: String (nullable, references Agency.id)
- agent: String (nullable, references Agent.id)
- createdAt: DateTime (default now)
- isFeatured: Boolean (default false)
- isApproved: Boolean (default false)
- isDeleted: Boolean (default false)

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
- area: Decimal(12,2)
- facing: String (varchar 50)
- roadAccess: Decimal(8,2)

## Property_apartment_detail (PropertyApartmentDetail)
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
- superArea: Decimal(12,2)
- builtUpArea: Decimal(12,2)
- maintenanceFee: Decimal(18,2)

## property_land_detail (PropertyLandDetail)
- propertyId: String (cuid, primary key, unique, references Property.id)
- area: Decimal(12,2)
- facing: String (varchar 50)
- roadAccess: Decimal(8,2)
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
- frontage: Decimal(12,2)
- usableArea: Decimal(12,2)
- buildingType: String (varchar 100)

## property_price (PropertyPrice)
- id: String (cuid, primary key, unique)
- propertyId: String (cuid, references Property.id)
- for: String (land, land_rental)
- currency: String (varchar 10)
- unit: String (varchar)
- price: Decimal (18,2)
- priceUnit: String (varchar 24)




## agencies (Agency)
- id: String (cuid)
- name: String
- logoUrl: String?
- website: String?
- registeredName: String?
- contactEmail: String?
- contactPhone: String?
- mainLocation: String?
- branches: String[] (default [])
- contactPersonName: String?
- contactPersonRole: String?
- description: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## agents (Agent)
- id: String (cuid)
- name: String
- slug: String? (unique)
- location: String?
- registered: Boolean (default false)
- userId: String?
- email: String?
- phone: String?
- about: String?
- photoUrl: String?
- specializations: String[] (default [])
- availabilityHours: String?
- timeSlotDuration: Int?
- unavailability: Json?
- agencyId: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)


## reviews (Review) -> change to review (Review)
- id: String (cuid)
- reviewedBy: String (references Account.id)
- rating: Int
- review: String (varchar 255)
- reviewedOn: DateTime, not nullable
- response: String (varchar 255)
- responseBy: String (references Account.id)
- responseOn: Datetime, nullable







## requirements (Requirement)
- id: String (cuid)
- trackerId: String (cuid, references TrackerAccount.id)
- currency: String (varchar 8)
- pricingUnit: String (varchar 24)
- minPrice: Int?
- maxPrice: Int?
- location: String?
- locationGeo: String (varchar 48) -> locationGeoCoordinates -> cases like 1 mile radius.
- locationStructured: String or JSON
- purpose: String (buy/sell/buy_rental/sell_rental)
- type: String[] (default [])
- urgency: String?
- requiredTime: String?
- paymentMethod: String[] (default [])
- loan: Boolean (default false)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## user_saved_properties (UserSavedProperty) -> change to saved_property (SavedProperty)
- id: String (cuid, primary key)
- accountId: String (cuid, primary key, references Account.id)
- propertyId: String (references Property.id)
- savedAt: DateTime (default now)

## reacted_properties (ReactedProperty) -> make this table
- id: String (cuid, primary key)
- trackedId: String (references TrackerAccount.id)
- propertyId: String (references Property.id)
- onType: String (reacted on sell, reacted on property rental per unit per month cost)
- reaction: Enum (Liked/Disliked/Reported)
- reactedAt: Datetime (default now)

## property_views (PropertyViews) -> make this table
- id: String (cuid, primary key)
- accountId: String (references Account.id)
- propertyId: String (references Property.id)
- onType: String (reacted on sell, reacted on property rental per unit per month cost)
- viewedAt: Datetime (default now)
- timeViewed: Int (time in milliseconds)
- viewedOn: String (homepage/feed/propertyPage/ad)






















## conversations (Conversation)
- id: String (cuid)
- accountId: String?
- customerName: String
- customerPhone: String
- customerEmail: String?
- customerAvatarUrl: String?
- notes: String?
- assignedTo: String (default "AI Assistant")
- subject: String
- lastMessageAt: DateTime (default now)
- lastMessageSnippet: String?
- lastMessageSender: String (default "agent")
- isRead: Boolean (default true)
- leadCategory: String (default "New Inquiry")
- leadScore: Int (default 5)
- aiInterventionActive: Boolean (default true)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## messages (Message)
- id: String (cuid)
- conversationId: String
- sender: String
- text: String
- timestamp: DateTime (default now)

## site_content (SiteContent)
- id: String (cuid)
- key: String (unique)
- value: String
- section: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## user_preferences (UserPreference)
- id: String (cuid)
- accountId: String (unique)
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
- id: String (cuid)
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
- id: String (cuid)
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
- id: String (cuid)
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
- id: String (cuid)
- propertyId: String
- propertyTitle: String
- agentId: String
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
- id: String (cuid)
- context: String
- message: String
- stack: String?
- details: Json?
- createdAt: DateTime (default now)

## newsletter_subscriptions (NewsletterSubscription) -> drop table.
- id: String (cuid)
- email: String (unique)
- createdAt: DateTime (default now)

## sitemaps (SitemapEntry)
- id: String (cuid)
- url: String (unique)
- priority: Float (default 0.5)
- frequency: String (default "weekly")
- lastmod: DateTime?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## ai_models (AIModel)
- id: String (cuid)
- modelId: String
- name: String
- description: String?
- costPerMillionInputTokens: Float (default 0)
- costPerMillionOutputTokens: Float (default 0)
- isDefault: Boolean (default false)
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## prompts (Prompt)
- id: String
- promptText: String
- description: String
- name: String
- placeholders: String[] (default [])
- model: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

## whatsapp_config (WhatsAppConfig)
- id: String
- apiToken: String?
- phoneNumberId: String?
- accountId: String?
- webhookVerifyToken: String?
- updatedAt: DateTime (auto)

## whatsapp_templates (WhatsAppTemplate)
- id: String (cuid)
- name: String
- category: String
- language: String
- body: String
- status: String
- isPreapproved: Boolean (default false)
- createdAt: DateTime (default now)

## contact_submissions (ContactSubmission)
- id: String (cuid)
- name: String
- email: String
- phone: String?
- subject: String
- body: String
- status: String (default "new")
- createdAt: DateTime (default now)

## inquiries (Inquiry)
- id: String (cuid)
- propertyId: String
- propertyTitle: String
- agentName: String?
- name: String
- email: String
- phone: String?
- question: String
- status: String (default "new")
- createdAt: DateTime (default now)
