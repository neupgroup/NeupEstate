::neup.documentation::database-schema

# Database Schema

Generated from the live PostgreSQL database and compared against `prisma/schema.prisma`.

- Tables: 61
- Prisma models: 59

## Tables

### public._prisma_migrations (no Prisma model)

- purpose: Prisma migration history table used to track which migrations have been applied.
- usage: Used by Prisma CLI/migration tooling, not by application business code.

- id varchar(36) PK, NOT NULL
- checksum varchar(64) NOT NULL
- finished_at timestamptz(6)
- migration_name varchar(255) NOT NULL
- logs text
- rolled_back_at timestamptz(6)
- started_at timestamptz(6) NOT NULL, default now()
- applied_steps_count integer NOT NULL, default 0

- divergence: table has no matching Prisma model; columns not in model: id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
- divergence based on fields: database has 8 fields; Prisma model has 0 persisted scalar fields; difference 8

### public.account (Account)

- purpose: Canonical local account/profile record for NeupID users, agencies, agents, and working-profile context.
- usage: Used across auth, account management, agency/team flows, bridge account lookup/webhooks, saved/viewed/reacted cleanup, and authorization through `account_access`.

- id text PK, NOT NULL
- accountType text NOT NULL
- created_on timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- accessed_on timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- displayImage text
- displayName text
- neup_id text UNIQUE account_neupId_key(neup_id); account_neup_id_key(neup_id)
- connectionId text
- working_profile text FK account_working_profile_fkey -> public.account(id)

- divergence: model Account maps to table account; mapped fields: neupId->neup_id, createdOn->created_on, accessedOn->accessed_on, workingProfile->working_profile
- divergence based on fields: database has 9 fields; Prisma model has 9 persisted scalar fields; difference 0

### public.account_access (AccountAccess)

- purpose: Join table assigning one or more authorization roles to an account for an app.
- usage: Used by permission resolution, account detail pages, account deletion cleanup, and authz synchronization.

- account_id text PK, NOT NULL, FK account_access_account_id_fkey -> public.account(id)
- app_id text PK, NOT NULL
- role_id text PK, NOT NULL, FK account_access_role_id_fkey -> public.authz_role(id)
- updated_on timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- divergence: model AccountAccess maps to table account_access; mapped fields: accountId->account_id, appId->app_id, roleId->role_id, updatedOn->updated_on
- divergence based on fields: database has 4 fields; Prisma model has 4 persisted scalar fields; difference 0

### public.activity (Activity)

- purpose: Stores user/account activity events keyed by account id.
- usage: Used by account activity pages, account deletion cleanup, and activity logging/reporting flows.

- id text PK, NOT NULL
- accountId text NOT NULL
- title text NOT NULL
- details jsonb NOT NULL
- activityOn timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- ipAddress text NOT NULL

- divergence: model Activity maps to table activity
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.agencies (Agency)

- purpose: Stores public agency directory/profile records such as name, contact details, branches, and description.
- usage: Used by agency listing/admin services and agency customization/mapping relationships.

- id text PK, NOT NULL
- name text NOT NULL
- logoUrl text
- registeredName text
- contactEmail text
- contactPhone text
- mainLocation text
- branches text[] default ARRAY[]::text[]
- description text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- divergence: model Agency maps to table agencies
- divergence based on fields: database has 11 fields; Prisma model has 11 persisted scalar fields; difference 0

### public.agency_agent_map (AgencyAgentMap)

- purpose: Links agency accounts to agent accounts, including invitation/status and admin membership state.
- usage: Used by agency management, team membership actions, account deletion cleanup, and agency agent counts.

- id text PK, NOT NULL
- agency_id text NOT NULL, UNIQUE agency_agent_map_agency_id_agent_id_key(agency_id, agent_id), FK agency_agent_map_agency_id_fkey -> public.account(id)
- agent_id text NOT NULL, UNIQUE agency_agent_map_agency_id_agent_id_key(agency_id, agent_id), FK agency_agent_map_agent_id_fkey -> public.account(id)
- status text NOT NULL, default 'invited'::text
- is_admin boolean NOT NULL, default false
- divergence: model AgencyAgentMap maps to table agency_agent_map; mapped fields: agencyId->agency_id, agentId->agent_id, isAdmin->is_admin
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.agency_customization (AgencyCustomization)

- purpose: Stores per-agency customization payloads for agency-owned presentation or settings.
- usage: Used through the agency customization relation for agency-specific configuration.

- id text PK, NOT NULL
- agencyId text NOT NULL, UNIQUE agency_customization_agencyId_customizeFor_key(agencyId, customizeFor), FK agency_customization_agencyId_fkey -> public.agencies(id)
- customizeFor text NOT NULL, UNIQUE agency_customization_agencyId_customizeFor_key(agencyId, customizeFor)
- customization jsonb NOT NULL
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- divergence: model AgencyCustomization maps to table agency_customization
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.agency_map (AgencyMap)

- purpose: Maps accounts to agency records with role and lock-in status.
- usage: Used by accounts/team pages to resolve agency membership and by account deletion cleanup.

- id text PK, NOT NULL
- agencyAccountId text NOT NULL, FK agency_map_agencyAccountId_fkey -> public.agencies(id)
- accountId text NOT NULL
- role text NOT NULL
- lockIn boolean NOT NULL, default false
- divergence: model AgencyMap maps to table agency_map
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.agents (Agent)

- purpose: Stores public agent directory/profile records independent of the account table.
- usage: Used by agent listing/profile services and agent-facing public pages.

- id text PK, NOT NULL
- name text NOT NULL
- slug text UNIQUE agents_slug_key(slug)
- location text
- registered boolean NOT NULL, default false
- userId text
- email text
- phone text
- about text
- photoUrl text
- specializations text[] default ARRAY[]::text[]
- availabilityHours text
- timeSlotDuration integer
- unavailability jsonb
- agencyId text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- divergence: model Agent maps to table agents
- divergence based on fields: database has 17 fields; Prisma model has 17 persisted scalar fields; difference 0

### public.authz_account_access_grant (AuthzAccountAccessGrant)

- purpose: Stores account-to-account access grants for authorization delegation.
- usage: Used by `services/authz-service.ts`, authz webhooks, account-service cleanup, and grant management flows.

- id text PK, NOT NULL
- owner_account_id text NOT NULL
- target_account_id text NOT NULL
- role_id text NOT NULL
- portfolio_id text

- divergence: model AuthzAccountAccessGrant maps to table authz_account_access_grant; mapped fields: ownerAccountId->owner_account_id, targetAccountId->target_account_id, roleId->role_id, portfolioId->portfolio_id
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.authz_assets_access_grant (AuthzAssetsAccessGrant)

- purpose: Stores role grants that give accounts access to specific assets, portfolios, or asset types.
- usage: Used by `services/authz-service.ts`, authz webhooks, account-service cleanup, and asset permission checks.

- id text PK, NOT NULL
- asset_id text NOT NULL
- account_id text NOT NULL
- role_id text NOT NULL
- portfolio_id text
- asset_type text

- divergence: model AuthzAssetsAccessGrant maps to table authz_assets_access_grant; mapped fields: assetId->asset_id, accountId->account_id, roleId->role_id, portfolioId->portfolio_id, assetType->asset_type
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.authz_role (AuthzRole)

- purpose: Defines roles, acquisition metadata, approval policy, applicability, and denormalized permissions.
- usage: Used by permission resolution, account primary roles, account access rows, role webhooks, and manage-account pages.

- id text PK, NOT NULL
- name text NOT NULL
- description text
- app_id text NOT NULL
- scope text
- permissions jsonb
- updatedOn timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- acquisition_type text
- approval_policy text
- applicable_for jsonb

- divergence: model AuthzRole maps to table authz_role; mapped fields: appId->app_id, acquisitionType->acquisition_type, approvalPolicy->approval_policy, applicableFor->applicable_for
- divergence based on fields: database has 10 fields; Prisma model has 10 persisted scalar fields; difference 0

### public.authz_role_capability (RoleCapability)

- purpose: Stores normalized role-to-capability mappings and denormalized capability snapshots.
- usage: Used by `services/authz-service.ts` and authz role webhook synchronization.

- id text PK, NOT NULL
- role_id text NOT NULL
- capability_id text NOT NULL
- scope text
- denormalized_capability jsonb
- role_name text

- divergence: model RoleCapability maps to table authz_role_capability; mapped fields: roleId->role_id, capabilityId->capability_id, denormalizedCapability->denormalized_capability, roleName->role_name
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.base_lead (BaseLead)

- purpose: Stores reusable lead/client identity and contact payload shared by lead workflows.
- usage: Used by lead search, client contacts, client links, property owners, and shared lead records.

- id text PK, NOT NULL
- firstName text NOT NULL
- lastName text NOT NULL
- contact jsonb NOT NULL
- source text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model BaseLead maps to table base_lead; model fields not in table: belongsTo
- divergence based on fields: database has 7 fields; Prisma model has 8 persisted scalar fields; difference -1

### public.client_contact (ClientContact)

- purpose: Stores normalized contact methods for a base lead/client.
- usage: Used through lead/client management relationships for phone, email, and other contact values.

- id text PK, NOT NULL
- client_id text NOT NULL, FK client_contact_client_id_fkey -> public.base_lead(id)
- type text NOT NULL
- value text NOT NULL

- divergence: model ClientContact maps to table client_contact; mapped fields: clientId->client_id
- divergence based on fields: database has 4 fields; Prisma model has 4 persisted scalar fields; difference 0

### public.client_link (ClientLink)

- purpose: Links tracked users/accounts to base leads.
- usage: Used by lead search and account deletion cleanup for tracker-based lead linkage.

- id text PK, NOT NULL
- trackerId text NOT NULL
- clientId text NOT NULL, FK client_link_clientId_fkey -> public.base_lead(id)

- divergence: model ClientLink maps to table client_link
- divergence based on fields: database has 3 fields; Prisma model has 3 persisted scalar fields; difference 0

### public.competitor (Competitor)

- purpose: Stores competitor entities used for market and listing intelligence.
- usage: Used by competitor management, intelligence criteria, competitor pages/listings/sources, and alerts.

- id text PK, NOT NULL
- name text NOT NULL
- description text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- crawlRules jsonb

- divergence: model Competitor maps to table competitor
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.competitor_listings (CompetitorListing)

- purpose: Stores normalized listing data extracted from competitor pages.
- usage: Used by competitor intelligence logs/listings pages, comparison mapping, and market alert generation.

- id text PK, NOT NULL
- competitorPageId text NOT NULL, UNIQUE competitor_listings_competitorPageId_key(competitorPageId), FK competitor_listings_competitorPageId_fkey -> public.competitor_pages(id)
- title text NOT NULL
- description text
- purpose text NOT NULL
- agentName text
- price jsonb
- priceBasis text
- isSold boolean NOT NULL, default false
- details jsonb
- loggedOn timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- competitorId text NOT NULL, FK competitor_listings_competitorId_fkey -> public.competitor(id)

- divergence: model CompetitorListing maps to table competitor_listings
- divergence based on fields: database has 14 fields; Prisma model has 14 persisted scalar fields; difference 0

### public.competitor_pages (CompetitorPage)

- purpose: Stores crawled competitor page metadata, source URLs, visible HTML, and logging status.
- usage: Used by competitor crawling/logging services, tracking, and listing extraction.

- id text PK, NOT NULL
- competitorId text NOT NULL, FK competitor_properties_competitorId_fkey -> public.competitor(id)
- title text NOT NULL
- description text
- source text NOT NULL
- details jsonb
- listedOn timestamp(3)
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- visibleHtml text
- lastLoggedStatus text
- lastLoggedOn timestamp(3)

- divergence: model CompetitorPage maps to table competitor_pages
- divergence based on fields: database has 12 fields; Prisma model has 12 persisted scalar fields; difference 0

### public.competitor_sources (CompetitorSource)

- purpose: Stores source definitions such as sitemap, link, or manual source for competitor crawling.
- usage: Used by competitor source create/delete flows and crawl setup.

- id text PK, NOT NULL
- competitorId text NOT NULL, FK competitor_sources_competitorId_fkey -> public.competitor(id)
- type text NOT NULL
- value text NOT NULL
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model CompetitorSource maps to table competitor_sources
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.competitor_tracking (CompetitorTracking)

- purpose: Tracks competitor pages against optional internal property ids.
- usage: Used by competitor tracking create/delete/list flows.

- id text PK, NOT NULL
- competitorPageId text NOT NULL, FK competitor_tracking_competitorPageId_fkey -> public.competitor_pages(id)
- ourPropertyId text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model CompetitorTracking maps to table competitor_tracking
- divergence based on fields: database has 4 fields; Prisma model has 4 persisted scalar fields; difference 0

### public.contact_submissions (ContactSubmission)

- purpose: Stores general contact form submissions.
- usage: Used by contact-service create/list workflows and admin contact review.

- id text PK, NOT NULL
- name text NOT NULL
- email text NOT NULL
- phone text
- subject text NOT NULL
- body text NOT NULL
- status text NOT NULL, default 'new'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model ContactSubmission maps to table contact_submissions
- divergence based on fields: database has 8 fields; Prisma model has 8 persisted scalar fields; difference 0

### public.conversations (Conversation)

- purpose: Stores customer conversation thread metadata, assignment, read state, AI intervention status, and lead scoring.
- usage: Used by conversation-service listing, creation, updates, deletion, and message grouping.

- id text PK, NOT NULL
- accountId text
- customerName text NOT NULL
- customerPhone text NOT NULL
- customerEmail text
- customerAvatarUrl text
- notes text
- assignedTo text NOT NULL, default 'AI Assistant'::text
- subject text NOT NULL
- lastMessageAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- lastMessageSnippet text
- lastMessageSender text NOT NULL, default 'agent'::text
- isRead boolean NOT NULL, default true
- leadCategory text NOT NULL, default 'New Inquiry'::text
- leadScore integer NOT NULL, default 5
- aiInterventionActive boolean NOT NULL, default true
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model Conversation maps to table conversations
- divergence based on fields: database has 18 fields; Prisma model has 18 persisted scalar fields; difference 0

### public.faqs (FAQ)

- purpose: Stores FAQ questions, answers, and categories.
- usage: Used by FAQ service for public/admin FAQ listing, creation, update, and deletion.

- id text PK, NOT NULL
- question text NOT NULL
- answer text NOT NULL
- category text NOT NULL, default 'General'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model FAQ maps to table faqs
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.inquiries (Inquiry)

- purpose: Stores property-specific customer questions/inquiries.
- usage: Used by inquiry-service create/list/update flows and property inquiry forms.

- id text PK, NOT NULL
- propertyId text NOT NULL
- propertyTitle text NOT NULL
- agentName text
- name text NOT NULL
- email text NOT NULL
- phone text
- question text NOT NULL
- status text NOT NULL, default 'new'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model Inquiry maps to table inquiries
- divergence based on fields: database has 10 fields; Prisma model has 10 persisted scalar fields; difference 0

### public.intelligence_alerts (IntelligenceAlert)

- purpose: Stores generated competitor intelligence alerts for account criteria and competitor listings.
- usage: Used by manage intelligence pages and intelligence mapping relationships.

- id text PK, NOT NULL
- map_id text NOT NULL, FK intelligence_alerts_map_id_fkey -> public.intelligence_mapping(id)
- account_id text NOT NULL, FK intelligence_alerts_account_id_fkey -> public.account(id)
- listing_id text NOT NULL, FK intelligence_alerts_listing_id_fkey -> public.competitor(id)
- status text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model IntelligenceAlert maps to table intelligence_alerts; mapped fields: mapId->map_id, accountId->account_id, listingId->listing_id
- divergence based on fields: database has 7 fields; Prisma model has 7 persisted scalar fields; difference 0

### public.intelligence_mapping (IntelligenceMapping)

- purpose: Stores account-level competitor intelligence criteria such as location, budget, type, purpose, and competitor.
- usage: Used by manage intelligence criteria pages/actions and alert generation relationships.

- id text PK, NOT NULL
- account_id text NOT NULL, FK intelligence_mapping_account_id_fkey -> public.account(id)
- c_location text
- c_min_budget integer
- c_max_budget integer
- c_competitor text FK intelligence_mapping_c_competitor_fkey -> public.competitor(id)
- c_type text
- c_purpose text NOT NULL
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model IntelligenceMapping maps to table intelligence_mapping; mapped fields: accountId->account_id, cLocation->c_location, cMinBudget->c_min_budget, cMaxBudget->c_max_budget, cCompetitorId->c_competitor, cType->c_type, cPurpose->c_purpose
- divergence based on fields: database has 10 fields; Prisma model has 10 persisted scalar fields; difference 0

### public.lead_activity (LeadActivity)

- purpose: Stores activity history for shared leads.
- usage: Used through shared lead activity relationships for lead timeline/audit data.

- id text PK, NOT NULL
- leadId text NOT NULL, FK lead_activity_leadId_fkey -> public.shared_leads(id)
- data jsonb NOT NULL
- activityOn timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- activityBy text NOT NULL

- divergence: model LeadActivity maps to table lead_activity
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.messages (Message)

- purpose: Stores individual messages inside conversation threads.
- usage: Used by conversation-service message creation, listing, and deletion.

- id text PK, NOT NULL
- conversationId text NOT NULL, FK messages_conversationId_fkey -> public.conversations(id)
- sender text NOT NULL
- text text NOT NULL
- timestamp timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model Message maps to table messages
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.mortgage_requests (MortgageRequest)

- purpose: Stores mortgage assistance request submissions.
- usage: Used by request/admin workflows that capture and process mortgage leads.

- id text PK, NOT NULL
- name text NOT NULL
- email text NOT NULL
- phone text NOT NULL
- address text NOT NULL
- age integer NOT NULL
- income integer NOT NULL
- moreDetails text
- contactMethods text[] default ARRAY[]::text[]
- status text NOT NULL, default 'new'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model MortgageRequest maps to table mortgage_requests
- divergence based on fields: database has 12 fields; Prisma model has 12 persisted scalar fields; difference 0

### public.newsletter_subscriptions (NewsletterSubscription)

- purpose: Stores newsletter subscriber email addresses.
- usage: Used by newsletter signup and subscription management flows.

- id text PK, NOT NULL
- email text NOT NULL, UNIQUE newsletter_subscriptions_email_key(email)
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model NewsletterSubscription maps to table newsletter_subscriptions
- divergence based on fields: database has 3 fields; Prisma model has 3 persisted scalar fields; difference 0

### public.problems (Problem)

- purpose: Stores application problem/error reports with context, stack, and details.
- usage: Used by problem-service and site-dev-log-service for diagnostics and cleanup.

- id text PK, NOT NULL
- context text NOT NULL
- message text NOT NULL
- stack text
- details jsonb
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model Problem maps to table problems
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.property (Property)

- purpose: Main real-estate listing table containing searchable/display listing data, status, location, pricing, and structured details.
- usage: Used across property listing/detail pages, bridge property APIs, agency stats, draft approval, saved/reacted/viewed flows, and competitor mapping.

- id text PK, NOT NULL
- slug text NOT NULL, UNIQUE property_slug_key(slug)
- title varchar(255) NOT NULL
- description text NOT NULL
- coverImage varchar(255) NOT NULL
- type PropertyType NOT NULL
- purpose PropertyPurpose NOT NULL
- status PropertyStatus NOT NULL, default 'PENDING'::"PropertyStatus"
- currency varchar(10) NOT NULL
- displayPrice numeric(18,2) NOT NULL
- displayPriceUnit varchar(24) NOT NULL
- areaUnit varchar(64) NOT NULL
- locationText varchar(255) NOT NULL
- geoLocation varchar(63) NOT NULL
- structuredLocation text NOT NULL
- agency text
- agent text
- pricing jsonb
- roadAccessDetails jsonb
- distancing jsonb
- earnings jsonb
- landDetails jsonb
- plots jsonb
- apartmentDetails jsonb
- metaTags text[] default ARRAY[]::text[]
- amenities text[] default ARRAY[]::text[]
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- isFeatured boolean NOT NULL, default false
- isApproved boolean NOT NULL, default false
- isDeleted boolean NOT NULL, default false
- customId text
- details jsonb

- divergence: model Property maps to table property
- divergence based on fields: database has 33 fields; Prisma model has 33 persisted scalar fields; difference 0

### public.property_apartment_detail (PropertyApartmentDetail)

- purpose: Stores apartment-specific one-to-one details for a property.
- usage: Used through property detail relations and property create/edit/read flows for apartment listings.

- propertyId text PK, NOT NULL, UNIQUE property_apartment_detail_propertyId_key(propertyId), FK property_apartment_detail_propertyId_fkey -> public.property(id)
- bedrooms integer NOT NULL
- bathrooms integer NOT NULL
- onFloor integer NOT NULL
- totalFloors integer NOT NULL
- balconies integer NOT NULL
- lifts integer NOT NULL
- carParkingSpots integer NOT NULL
- bikeParkingSpots integer NOT NULL
- furnished boolean NOT NULL
- blockName varchar(100) NOT NULL
- unitNumber varchar(100) NOT NULL
- superArea numeric(18,8) NOT NULL
- builtUpArea numeric(18,8) NOT NULL
- maintenanceFee numeric(18,8) NOT NULL

- divergence: model PropertyApartmentDetail maps to table property_apartment_detail
- divergence based on fields: database has 15 fields; Prisma model has 15 persisted scalar fields; difference 0

### public.property_changes (PropertyChange)

- purpose: Stores property draft/change requests and approval workflow payloads.
- usage: Used heavily by property draft/review services and manage property approval pages.

- id text PK, NOT NULL
- data jsonb NOT NULL
- modifiedOn timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- status text NOT NULL, default 'editing'::text
- createdOn timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- property_id text FK property_changes_property_id_fkey -> public.property(id)
- is_approved boolean
- account_id text NOT NULL, FK property_changes_account_id_fkey -> public.account(id)
- created_by_id text FK property_changes_created_by_id_fkey -> public.account(id)
- created_for_id text FK property_changes_created_for_id_fkey -> public.account(id)
- working_profile_id text FK property_changes_working_profile_id_fkey -> public.account(id)

- divergence: model PropertyChange maps to table property_changes; mapped fields: propertyId->property_id, accountId->account_id, createdById->created_by_id, createdForId->created_for_id, workingProfileId->working_profile_id, isApproved->is_approved
- divergence based on fields: database has 11 fields; Prisma model has 11 persisted scalar fields; difference 0

### public.property_commercial_detail (PropertyCommercialDetail)

- purpose: Stores commercial-property-specific one-to-one details.
- usage: Used through property detail relations and property create/edit/read flows for commercial listings.

- propertyId text PK, NOT NULL, UNIQUE property_commercial_detail_propertyId_key(propertyId), FK property_commercial_detail_propertyId_fkey -> public.property(id)
- floor integer NOT NULL
- washrooms integer NOT NULL
- parkingSpots integer NOT NULL
- frontage numeric(18,8) NOT NULL
- usableArea numeric(18,8) NOT NULL
- buildingType varchar(100) NOT NULL

- divergence: model PropertyCommercialDetail maps to table property_commercial_detail
- divergence based on fields: database has 7 fields; Prisma model has 7 persisted scalar fields; difference 0

### public.property_competition_map (PropertyCompetitionMap)

- purpose: Maps internal properties to competitor listings with verification status.
- usage: Used by competitor intelligence comparison and property competition tracking.

- id text PK, NOT NULL
- property_id text NOT NULL, FK property_competition_map_property_id_fkey -> public.property(id)
- competitor_property_id text NOT NULL, FK property_competition_map_competitor_property_id_fkey -> public.competitor_listings(id)
- status text NOT NULL, default 'UNVERIFIED'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model PropertyCompetitionMap maps to table property_competition_map; mapped fields: propertyId->property_id, competitorPropertyId->competitor_property_id
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.property_document (PropertyDocument)

- purpose: Stores documents attached to properties.
- usage: Used through property relations for listing documentation and property management.

- id text PK, NOT NULL
- propertyId text NOT NULL, FK property_document_propertyId_fkey -> public.property(id)
- name text NOT NULL
- urls jsonb NOT NULL
- sortOrder integer NOT NULL, default 0

- divergence: model PropertyDocument maps to table property_document
- divergence based on fields: database has 5 fields; Prisma model has 5 persisted scalar fields; difference 0

### public.property_house_detail (PropertyHouseDetail)

- purpose: Stores house-specific one-to-one details for a property.
- usage: Used through property detail relations and property create/edit/read flows for house listings.

- propertyId text PK, NOT NULL, UNIQUE property_house_detail_propertyId_key(propertyId), FK property_house_detail_propertyId_fkey -> public.property(id)
- bedrooms integer NOT NULL
- bathrooms integer NOT NULL
- floors integer NOT NULL
- kitchens integer NOT NULL
- livingRooms integer NOT NULL
- diningRooms integer NOT NULL
- carParkingSpots integer NOT NULL
- bikeParkingSpots integer NOT NULL
- furnished boolean NOT NULL
- buildYear integer NOT NULL
- area numeric(18,8) NOT NULL
- facing varchar(50) NOT NULL
- roadAccess numeric(18,8) NOT NULL

- divergence: model PropertyHouseDetail maps to table property_house_detail
- divergence based on fields: database has 14 fields; Prisma model has 14 persisted scalar fields; difference 0

### public.property_land_detail (PropertyLandDetail)

- purpose: Stores land-specific one-to-one details for a property.
- usage: Used through property detail relations and property create/edit/read flows for land listings.

- propertyId text PK, NOT NULL, UNIQUE property_land_detail_propertyId_key(propertyId), FK property_land_detail_propertyId_fkey -> public.property(id)
- area numeric(18,8) NOT NULL
- facing varchar(50) NOT NULL
- roadAccess numeric(18,8) NOT NULL
- plotShape varchar(100) NOT NULL
- cornerPlot boolean NOT NULL
- waterAvailable boolean NOT NULL
- electricityAvailable boolean NOT NULL
- boundaryWall boolean NOT NULL

- divergence: model PropertyLandDetail maps to table property_land_detail
- divergence based on fields: database has 9 fields; Prisma model has 9 persisted scalar fields; difference 0

### public.property_link (PropertyLink)

- purpose: Stores links between related primary and secondary properties.
- usage: Used through property relations for related/linked listing behavior.

- id text PK, NOT NULL
- primaryId text NOT NULL, FK property_link_primaryId_fkey -> public.property(id)
- secondaryId text NOT NULL, FK property_link_secondaryId_fkey -> public.property(id)

- divergence: model PropertyLink maps to table property_link
- divergence based on fields: database has 3 fields; Prisma model has 3 persisted scalar fields; difference 0

### public.property_log (PropertyLog)

- purpose: Stores property request/approval logs with requested and approved payload data.
- usage: Used by property logging and approval/audit flows.

- id text PK, NOT NULL
- property_id text NOT NULL
- requested_by text NOT NULL
- approved_by text
- data jsonb[] NOT NULL, default ARRAY[]::jsonb[]
- requested_on timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- approved_on timestamp(3)

- divergence: model PropertyLog maps to table property_log; mapped fields: propertyId->property_id, requestedBy->requested_by, approvedBy->approved_by, requestedOn->requested_on, approvedOn->approved_on
- divergence based on fields: database has 7 fields; Prisma model has 7 persisted scalar fields; difference 0

### public.property_media (PropertyMedia)

- purpose: Stores property images/media URLs, alt text, ordering, and deletion state.
- usage: Used by property cards, detail pages, carousels, and property create/edit flows.

- id text PK, NOT NULL
- propertyId text NOT NULL, FK property_media_propertyId_fkey -> public.property(id)
- type text NOT NULL
- url varchar(500) NOT NULL
- alt varchar(255) NOT NULL
- sortOrder integer NOT NULL, default 0
- isPrimary boolean NOT NULL, default false
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- isDeleted boolean NOT NULL, default false

- divergence: model PropertyMedia maps to table property_media
- divergence based on fields: database has 9 fields; Prisma model has 9 persisted scalar fields; difference 0

### public.property_owner (PropertyOwner)

- purpose: Links properties to base lead owner/client records.
- usage: Used by owner-info property form sections and lead/client ownership workflows.

- id text PK, NOT NULL
- property_id text NOT NULL, UNIQUE property_owner_property_id_owner_client_id_key(property_id, owner_client_id), FK property_owner_property_id_fkey -> public.property(id)
- owner_client_id text NOT NULL, UNIQUE property_owner_property_id_owner_client_id_key(property_id, owner_client_id), FK property_owner_owner_client_id_fkey -> public.base_lead(id)
- is_primary_owner boolean NOT NULL, default false

- divergence: model PropertyOwner maps to table property_owner; mapped fields: propertyId->property_id, ownerClientId->owner_client_id, isPrimaryOwner->is_primary_owner
- divergence based on fields: database has 4 fields; Prisma model has 4 persisted scalar fields; difference 0

### public.property_price (PropertyPrice)

- purpose: Stores historical or alternate property price records.
- usage: Used through property price relations for listing pricing details and changes.

- id text PK, NOT NULL
- propertyId text NOT NULL, FK property_price_propertyId_fkey -> public.property(id)
- for text NOT NULL
- currency varchar(10) NOT NULL
- unit text NOT NULL
- price numeric(18,2) NOT NULL
- priceUnit varchar(24) NOT NULL

- divergence: model PropertyPrice maps to table property_price
- divergence based on fields: database has 7 fields; Prisma model has 7 persisted scalar fields; difference 0

### public.property_requests (PropertyRequest)

- purpose: Stores buyer/tenant property requirement submissions from public request forms.
- usage: Used by request/admin workflows that capture desired property criteria.

- id text PK, NOT NULL
- name text NOT NULL
- email text NOT NULL
- phone text
- location text
- propertyType text
- bedrooms integer
- bathrooms integer
- budget integer
- remarks text
- status text NOT NULL, default 'new'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model PropertyRequest maps to table property_requests
- divergence based on fields: database has 13 fields; Prisma model has 13 persisted scalar fields; difference 0

### public.property_views (PropertyView)

- purpose: Tracks property view events, viewer identity, duration, and source.
- usage: Used by property analytics, account deletion cleanup, and user preference counters.

- id text PK, NOT NULL
- accountId text NOT NULL
- propertyId text NOT NULL, FK property_views_propertyId_fkey -> public.property(id)
- onType text NOT NULL
- viewedAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- timeViewed integer NOT NULL
- viewedOn text NOT NULL

- divergence: model PropertyView maps to table property_views
- divergence based on fields: database has 7 fields; Prisma model has 7 persisted scalar fields; difference 0

### public.reacted_properties (ReactedProperty)

- purpose: Tracks property reactions such as liked, disliked, or reported.
- usage: Used by reaction flows, account deletion cleanup, and property engagement analytics.

- id text PK, NOT NULL
- trackedId text NOT NULL
- propertyId text NOT NULL, FK reacted_properties_propertyId_fkey -> public.property(id)
- onType text NOT NULL
- reaction Reaction NOT NULL
- reactedAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model ReactedProperty maps to table reacted_properties
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.requirements (Requirement)

- purpose: Stores saved/search property requirements for a user.
- usage: Used by requirements-service create/read/list/update flows and account cleanup.

- id text PK, NOT NULL
- userId text NOT NULL
- minBudget integer
- maxBudget integer
- location text
- propertyType text[] default ARRAY[]::text[]
- purpose text
- urgency text
- requiredTime text
- paymentMethod text[] default ARRAY[]::text[]
- loan boolean NOT NULL, default false
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model Requirement maps to table requirements
- divergence based on fields: database has 13 fields; Prisma model has 13 persisted scalar fields; difference 0

### public.review (Review)

- purpose: Stores customer reviews, ratings, optional responses, and featured status.
- usage: Used by review display/admin workflows and site content sections.

- id text PK, NOT NULL
- reviewedBy text NOT NULL
- rating integer NOT NULL
- review varchar(255) NOT NULL
- reviewedOn timestamp(3) NOT NULL
- response varchar(255)
- responseBy text
- responseOn timestamp(3)

- divergence: model Review maps to table review
- divergence based on fields: database has 8 fields; Prisma model has 8 persisted scalar fields; difference 0

### public.sales_requests (SalesRequest)

- purpose: Stores seller/property-sale request submissions.
- usage: Used by request/admin workflows that capture sales leads.

- id text PK, NOT NULL
- name text NOT NULL
- email text NOT NULL
- phone text NOT NULL
- propertyLocation text NOT NULL
- propertyType text NOT NULL
- remarks text
- status text NOT NULL, default 'new'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model SalesRequest maps to table sales_requests
- divergence based on fields: database has 10 fields; Prisma model has 10 persisted scalar fields; difference 0

### public.saved_property (SavedProperty)

- purpose: Stores saved/bookmarked properties for accounts.
- usage: Used by saved-property user workflows, property relations, and account cleanup.

- id text PK, NOT NULL
- accountId text NOT NULL
- propertyId text NOT NULL, FK saved_property_propertyId_fkey -> public.property(id)
- savedAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model SavedProperty maps to table saved_property
- divergence based on fields: database has 4 fields; Prisma model has 4 persisted scalar fields; difference 0

### public.shared_leads (SharedLeads)

- purpose: Stores shared lead opportunities with type, requirements, priority, and owner.
- usage: Used by lead search, lead detail, lead activity, and owner-account relationships.

- id text PK, NOT NULL
- baseLeadId text NOT NULL, FK shared_leads_baseLeadId_fkey -> public.base_lead(id)
- type LeadType NOT NULL
- requirements jsonb
- priority LeadPriority NOT NULL, default 'MEDIUM'::"LeadPriority"
- owner text NOT NULL, FK shared_leads_owner_fkey -> public.account(id)
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model SharedLeads maps to table shared_leads
- divergence based on fields: database has 8 fields; Prisma model has 8 persisted scalar fields; difference 0

### public.SharedLead (no Prisma model)

- purpose: Legacy quoted shared-lead table retained in the live database.
- usage: Not used by the current Prisma schema; tracked as a migration/removal todo.

- id text PK, NOT NULL
- baseLead_id text NOT NULL, FK SharedLead_baseLead_id_fkey -> public.base_lead(id)
- type LeadType NOT NULL
- requirements jsonb
- priority LeadPriority NOT NULL, default 'MEDIUM'::"LeadPriority"
- leadOwner text FK SharedLead_leadOwner_fkey -> public.account(id)
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL
- ownerId text NOT NULL, FK SharedLead_ownerId_fkey -> public.account(id)

- divergence: table has no matching Prisma model; columns not in model: id, baseLead_id, type, requirements, priority, leadOwner, createdAt, updatedAt, ownerId
- divergence based on fields: database has 9 fields; Prisma model has 0 persisted scalar fields; difference 9

### public.site_content (SiteContent)

- purpose: Stores key/value site content and configuration entries.
- usage: Used by model-service for AI model configuration and by site content management.

- id text PK, NOT NULL
- key text NOT NULL, UNIQUE site_content_key_key(key)
- value text NOT NULL
- section text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model SiteContent maps to table site_content
- divergence based on fields: database has 6 fields; Prisma model has 6 persisted scalar fields; difference 0

### public.site_dev_log_entries (SiteDevLogEntry)

- purpose: Stores development/diagnostic request logs with status, outcome, timing, and details.
- usage: Used by site-dev-log-service for logging, listing, counts, and cleanup.

- id text PK, NOT NULL
- requestId text
- source text NOT NULL
- method text
- path text NOT NULL
- statusCode integer
- outcome text
- durationMs integer
- summary text
- details jsonb
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP

- divergence: model SiteDevLogEntry maps to table site_dev_log_entries
- divergence based on fields: database has 11 fields; Prisma model has 11 persisted scalar fields; difference 0

### public.site_dev_log_settings (SiteDevLogSetting)

- purpose: Stores the global site development logging enabled flag.
- usage: Used by site-dev-log-service to decide whether diagnostic logging is active.

- id text PK, NOT NULL
- enabled boolean NOT NULL, default false
- updatedAt timestamp(3) NOT NULL

- divergence: model SiteDevLogSetting maps to table site_dev_log_settings
- divergence based on fields: database has 3 fields; Prisma model has 3 persisted scalar fields; difference 0

### public.sitemaps (SitemapEntry)

- purpose: Stores sitemap URLs with priority, change frequency, and last-modified metadata.
- usage: Used by sitemap generation/management workflows.

- id text PK, NOT NULL
- url text NOT NULL, UNIQUE sitemaps_url_key(url)
- priority double precision NOT NULL, default 0.5
- frequency text NOT NULL, default 'weekly'::text
- lastmod timestamp(3)
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model SitemapEntry maps to table sitemaps
- divergence based on fields: database has 7 fields; Prisma model has 7 persisted scalar fields; difference 0

### public.team_members (TeamMember)

- purpose: Stores team member profile content for public/team pages.
- usage: Used by team member display and admin content management.

- id text PK, NOT NULL
- orgId text
- userId text
- name text NOT NULL
- slug text UNIQUE team_members_slug_key(slug)
- position text NOT NULL
- socialMedia jsonb
- about text NOT NULL
- moreDetails text
- photoUrl text
- registered boolean NOT NULL, default false
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model TeamMember maps to table team_members
- divergence based on fields: database has 13 fields; Prisma model has 13 persisted scalar fields; difference 0

### public.user_preferences (UserPreference)

- purpose: Stores per-account preference JSON and aggregate engagement counters.
- usage: Used by personalization/analytics flows and account deletion cleanup.

- id text PK, NOT NULL
- accountId text NOT NULL, UNIQUE user_preferences_accountId_key(accountId)
- updatedAt timestamp(3) NOT NULL
- preferences jsonb NOT NULL, default '{}'::jsonb
- totalViews integer NOT NULL, default 0
- totalSaves integer NOT NULL, default 0
- totalCalls integer NOT NULL, default 0
- totalInquiries integer NOT NULL, default 0
- totalVisitRequests integer NOT NULL, default 0
- totalMortgageRequests integer NOT NULL, default 0
- totalShares integer NOT NULL, default 0
- totalTimeSpentInSeconds integer NOT NULL, default 0

- divergence: model UserPreference maps to table user_preferences
- divergence based on fields: database has 12 fields; Prisma model has 12 persisted scalar fields; difference 0

### public.visit_requests (VisitRequest)

- purpose: Stores property visit/tour request submissions.
- usage: Used by request/admin workflows and property visit booking forms.

- id text PK, NOT NULL
- propertyId text NOT NULL
- propertyTitle text NOT NULL
- agentId text NOT NULL
- agentName text NOT NULL
- name text NOT NULL
- email text NOT NULL
- phone text
- preferredDate text NOT NULL
- preferredTime text
- status text NOT NULL, default 'new'::text
- createdAt timestamp(3) NOT NULL, default CURRENT_TIMESTAMP
- updatedAt timestamp(3) NOT NULL

- divergence: model VisitRequest maps to table visit_requests
- divergence based on fields: database has 13 fields; Prisma model has 13 persisted scalar fields; difference 0

::end
