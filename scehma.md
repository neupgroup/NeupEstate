# Database Schema (Prisma)

PostgreSQL database configured via `DATABASE_URL`.

## account (Account)
- id: String (cuid)
- accountType: String

## trackerAccount (TrackerAccount) -> create this table.
- id: String (cuid)
- accountId: references account (id)

## Activity
- id: String (cuid)
- trackerId: String (cuid) -> references -> trackerAccount



## users (User)
- id: String (cuid)
- name: String
- email: Json? (array of { type, value })
- phone: Json? (array of { type, value })
- location: String?
- role: String?
- lastLogin: DateTime?
- avatarUrl: String?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

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

## activities (Activity)
- id: String (cuid)
- trackerId: String
- activity: String
- page: String?
- propertyId: String?
- activityOn: DateTime (default now)
- duration: Int?

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

## newsletter_subscriptions (NewsletterSubscription)
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

## properties (Property)
- id: String (cuid)
- title: String?
- description: String?
- price: Int?
- location: String?
- bedrooms: Int?
- bathrooms: Int?
- area: Float?
- areaUnit: String?
- facing: String?
- buildStart: Int?
- buildCompleted: Int?
- purpose: String?
- purposes: String[] (default [])
- category: String?
- type: String?
- images: String[] (default [])
- amenities: String[] (default [])
- agency: Json?
- listingAgent: String?
- isOwnerListing: Boolean (default false)
- isFeatured: Boolean (default false)
- isApproved: Boolean (default false)
- status: String? (default "pending")
- sourceUrl: String?
- slug: String? (unique)
- floors: Int?
- onFloor: Int?
- roadAccess: Float?
- latitude: Float?
- longitude: Float?
- fetchHistory: Json?
- imageFetchHistory: Json?
- kitchens: Int?
- diningRooms: Int?
- livingRooms: Int?
- carParkingSpots: Int?
- bikeParkingSpots: Int?
- metaTitle: String?
- metaDescription: String?
- metaTags: String[] (default [])
- landDetails: Json?
- plots: Json?
- apartmentDetails: Json?
- apartmentUnits: Json?
- structuredLocation: Json?
- pricing: Json?
- roadAccessDetails: Json?
- distancing: Json?
- earnings: Json?
- owner: Json?
- owners: Json?
- documents: Json?
- createdAt: DateTime (default now)
- updatedAt: DateTime (auto)

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

## team_members (TeamMember)
- id: String (cuid)
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

## reviews (Review)
- id: String (cuid)
- targetId: String
- targetType: String
- targetName: String
- authorName: String
- authorEmail: String?
- rating: Int
- reviewText: String
- createdAt: DateTime (default now)

## requirements (Requirement)
- id: String (cuid)
- userId: String
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

## user_saved_properties (UserSavedProperty)
- userId: String
- propertyId: String
- propertyTitle: String?
- savedAt: DateTime (default now)
