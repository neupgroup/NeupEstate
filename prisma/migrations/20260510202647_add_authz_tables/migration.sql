-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "PropertyPurpose" AS ENUM ('SALE', 'RENT', 'LEASE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SOLD', 'RENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Reaction" AS ENUM ('Liked', 'Disliked', 'Reported');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('BUYER', 'SELLER', 'TENANT', 'LANDLORD');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "mainId" TEXT,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "accessedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "activityOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" VARCHAR(255) NOT NULL,
    "type" "PropertyType" NOT NULL,
    "purpose" "PropertyPurpose" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING',
    "currency" VARCHAR(10) NOT NULL,
    "displayPrice" DECIMAL(18,2) NOT NULL,
    "displayPriceUnit" VARCHAR(24) NOT NULL,
    "areaUnit" VARCHAR(64) NOT NULL,
    "locationText" VARCHAR(255) NOT NULL,
    "geoLocation" VARCHAR(63) NOT NULL,
    "structuredLocation" TEXT NOT NULL,
    "agency" TEXT,
    "agent" TEXT,
    "pricing" JSONB,
    "roadAccessDetails" JSONB,
    "distancing" JSONB,
    "earnings" JSONB,
    "landDetails" JSONB,
    "plots" JSONB,
    "apartmentDetails" JSONB,
    "metaTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "customId" TEXT,

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_link" (
    "id" TEXT NOT NULL,
    "primaryId" TEXT NOT NULL,
    "secondaryId" TEXT NOT NULL,

    CONSTRAINT "property_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "alt" VARCHAR(255) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_house_detail" (
    "propertyId" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "floors" INTEGER NOT NULL,
    "kitchens" INTEGER NOT NULL,
    "livingRooms" INTEGER NOT NULL,
    "diningRooms" INTEGER NOT NULL,
    "carParkingSpots" INTEGER NOT NULL,
    "bikeParkingSpots" INTEGER NOT NULL,
    "furnished" BOOLEAN NOT NULL,
    "buildYear" INTEGER NOT NULL,
    "area" DECIMAL(12,2) NOT NULL,
    "facing" VARCHAR(50) NOT NULL,
    "roadAccess" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "property_house_detail_pkey" PRIMARY KEY ("propertyId")
);

-- CreateTable
CREATE TABLE "property_apartment_detail" (
    "propertyId" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "onFloor" INTEGER NOT NULL,
    "totalFloors" INTEGER NOT NULL,
    "balconies" INTEGER NOT NULL,
    "lifts" INTEGER NOT NULL,
    "carParkingSpots" INTEGER NOT NULL,
    "bikeParkingSpots" INTEGER NOT NULL,
    "furnished" BOOLEAN NOT NULL,
    "blockName" VARCHAR(100) NOT NULL,
    "unitNumber" VARCHAR(100) NOT NULL,
    "superArea" DECIMAL(12,2) NOT NULL,
    "builtUpArea" DECIMAL(12,2) NOT NULL,
    "maintenanceFee" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "property_apartment_detail_pkey" PRIMARY KEY ("propertyId")
);

-- CreateTable
CREATE TABLE "property_land_detail" (
    "propertyId" TEXT NOT NULL,
    "area" DECIMAL(12,2) NOT NULL,
    "facing" VARCHAR(50) NOT NULL,
    "roadAccess" DECIMAL(8,2) NOT NULL,
    "plotShape" VARCHAR(100) NOT NULL,
    "cornerPlot" BOOLEAN NOT NULL,
    "waterAvailable" BOOLEAN NOT NULL,
    "electricityAvailable" BOOLEAN NOT NULL,
    "boundaryWall" BOOLEAN NOT NULL,

    CONSTRAINT "property_land_detail_pkey" PRIMARY KEY ("propertyId")
);

-- CreateTable
CREATE TABLE "property_commercial_detail" (
    "propertyId" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "washrooms" INTEGER NOT NULL,
    "parkingSpots" INTEGER NOT NULL,
    "frontage" DECIMAL(12,2) NOT NULL,
    "usableArea" DECIMAL(12,2) NOT NULL,
    "buildingType" VARCHAR(100) NOT NULL,

    CONSTRAINT "property_commercial_detail_pkey" PRIMARY KEY ("propertyId")
);

-- CreateTable
CREATE TABLE "property_price" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "for" TEXT NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "priceUnit" VARCHAR(24) NOT NULL,

    CONSTRAINT "property_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_fetch_history" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'data',
    "data" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "property_fetch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_owner" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "userId" TEXT,
    "unregisteredName" TEXT,
    "unregisteredEmail" TEXT,
    "unregisteredPhones" JSONB,
    "unregisteredNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "property_owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_document" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urls" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "property_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_change" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "modifiedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "registeredName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "mainLocation" TEXT,
    "branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_map" (
    "id" TEXT NOT NULL,
    "agencyAccountId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lockIn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "agency_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_customization" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customizeFor" TEXT NOT NULL,
    "customization" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_customization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "location" TEXT,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "about" TEXT,
    "photoUrl" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availabilityHours" TEXT,
    "timeSlotDuration" INTEGER,
    "unavailability" JSONB,
    "agencyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" VARCHAR(255) NOT NULL,
    "reviewedOn" TIMESTAMP(3) NOT NULL,
    "response" VARCHAR(255),
    "responseBy" TEXT,
    "responseOn" TIMESTAMP(3),

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minBudget" INTEGER,
    "maxBudget" INTEGER,
    "location" TEXT,
    "propertyType" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purpose" TEXT,
    "urgency" TEXT,
    "requiredTime" TEXT,
    "paymentMethod" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "loan" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_property" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reacted_properties" (
    "id" TEXT NOT NULL,
    "trackedId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "onType" TEXT NOT NULL,
    "reaction" "Reaction" NOT NULL,
    "reactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reacted_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_views" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "onType" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeViewed" INTEGER NOT NULL,
    "viewedOn" TEXT NOT NULL,

    CONSTRAINT "property_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "contact" JSONB NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_link" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "client_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_lead" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "LeadType" NOT NULL,
    "requirement" JSONB,
    "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "leadOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "activityOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityBy" TEXT NOT NULL,

    CONSTRAINT "lead_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAvatarUrl" TEXT,
    "notes" TEXT,
    "assignedTo" TEXT NOT NULL DEFAULT 'AI Assistant',
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageSnippet" TEXT,
    "lastMessageSender" TEXT NOT NULL DEFAULT 'agent',
    "isRead" BOOLEAN NOT NULL DEFAULT true,
    "leadCategory" TEXT NOT NULL DEFAULT 'New Inquiry',
    "leadScore" INTEGER NOT NULL DEFAULT 5,
    "aiInterventionActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "section" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalInquiries" INTEGER NOT NULL DEFAULT 0,
    "totalVisitRequests" INTEGER NOT NULL DEFAULT 0,
    "totalMortgageRequests" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSpentInSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "propertyType" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "budget" INTEGER,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortgage_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "income" INTEGER NOT NULL,
    "moreDetails" TEXT,
    "contactMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortgage_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "propertyLocation" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_requests" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyTitle" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "preferredDate" TEXT NOT NULL,
    "preferredTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitemaps" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priority" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "lastmod" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sitemaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "costPerMillionInputTokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPerMillionOutputTokens" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_config" (
    "id" TEXT NOT NULL,
    "apiToken" TEXT,
    "phoneNumberId" TEXT,
    "accountId" TEXT,
    "webhookVerifyToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isPreapproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyTitle" TEXT NOT NULL,
    "agentName" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "position" TEXT NOT NULL,
    "socialMedia" JSONB,
    "about" TEXT NOT NULL,
    "moreDetails" TEXT,
    "photoUrl" TEXT,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authz_role_capability" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "scope" TEXT,
    "denormalized_capability" JSONB,
    "role_name" TEXT,

    CONSTRAINT "authz_role_capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authz_account_access_grant" (
    "id" TEXT NOT NULL,
    "owner_account_id" TEXT NOT NULL,
    "target_account_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "portfolio_id" TEXT,

    CONSTRAINT "authz_account_access_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authz_assets_access_grant" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "portfolio_id" TEXT,
    "asset_type" TEXT,

    CONSTRAINT "authz_assets_access_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_sources" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_properties" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "details" JSONB,
    "listedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitor_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_tracking" (
    "id" TEXT NOT NULL,
    "competitorPropertyId" TEXT NOT NULL,
    "ourPropertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_trackerId_idx" ON "activity"("trackerId");

-- CreateIndex
CREATE UNIQUE INDEX "property_slug_key" ON "property"("slug");

-- CreateIndex
CREATE INDEX "property_type_idx" ON "property"("type");

-- CreateIndex
CREATE INDEX "property_purpose_idx" ON "property"("purpose");

-- CreateIndex
CREATE INDEX "property_status_idx" ON "property"("status");

-- CreateIndex
CREATE INDEX "property_agency_idx" ON "property"("agency");

-- CreateIndex
CREATE INDEX "property_agent_idx" ON "property"("agent");

-- CreateIndex
CREATE INDEX "property_media_propertyId_idx" ON "property_media"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_house_detail_propertyId_key" ON "property_house_detail"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_apartment_detail_propertyId_key" ON "property_apartment_detail"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_land_detail_propertyId_key" ON "property_land_detail"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_commercial_detail_propertyId_key" ON "property_commercial_detail"("propertyId");

-- CreateIndex
CREATE INDEX "property_price_propertyId_idx" ON "property_price"("propertyId");

-- CreateIndex
CREATE INDEX "property_fetch_history_propertyId_idx" ON "property_fetch_history"("propertyId");

-- CreateIndex
CREATE INDEX "property_fetch_history_fetchedAt_idx" ON "property_fetch_history"("fetchedAt");

-- CreateIndex
CREATE INDEX "property_owner_propertyId_idx" ON "property_owner"("propertyId");

-- CreateIndex
CREATE INDEX "property_document_propertyId_idx" ON "property_document"("propertyId");

-- CreateIndex
CREATE INDEX "property_change_propertyId_idx" ON "property_change"("propertyId");

-- CreateIndex
CREATE INDEX "property_change_modifiedOn_idx" ON "property_change"("modifiedOn");

-- CreateIndex
CREATE INDEX "agencies_name_idx" ON "agencies"("name");

-- CreateIndex
CREATE INDEX "agency_map_agencyAccountId_idx" ON "agency_map"("agencyAccountId");

-- CreateIndex
CREATE INDEX "agency_map_accountId_idx" ON "agency_map"("accountId");

-- CreateIndex
CREATE INDEX "agency_customization_agencyId_idx" ON "agency_customization"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "agency_customization_agencyId_customizeFor_key" ON "agency_customization"("agencyId", "customizeFor");

-- CreateIndex
CREATE UNIQUE INDEX "agents_slug_key" ON "agents"("slug");

-- CreateIndex
CREATE INDEX "agents_agencyId_idx" ON "agents"("agencyId");

-- CreateIndex
CREATE INDEX "agents_slug_idx" ON "agents"("slug");

-- CreateIndex
CREATE INDEX "review_reviewedBy_idx" ON "review"("reviewedBy");

-- CreateIndex
CREATE INDEX "requirements_userId_idx" ON "requirements"("userId");

-- CreateIndex
CREATE INDEX "saved_property_accountId_idx" ON "saved_property"("accountId");

-- CreateIndex
CREATE INDEX "saved_property_propertyId_idx" ON "saved_property"("propertyId");

-- CreateIndex
CREATE INDEX "reacted_properties_trackedId_idx" ON "reacted_properties"("trackedId");

-- CreateIndex
CREATE INDEX "reacted_properties_propertyId_idx" ON "reacted_properties"("propertyId");

-- CreateIndex
CREATE INDEX "property_views_accountId_idx" ON "property_views"("accountId");

-- CreateIndex
CREATE INDEX "property_views_propertyId_idx" ON "property_views"("propertyId");

-- CreateIndex
CREATE INDEX "client_lastName_idx" ON "client"("lastName");

-- CreateIndex
CREATE INDEX "client_link_trackerId_idx" ON "client_link"("trackerId");

-- CreateIndex
CREATE INDEX "client_link_clientId_idx" ON "client_link"("clientId");

-- CreateIndex
CREATE INDEX "client_lead_clientId_idx" ON "client_lead"("clientId");

-- CreateIndex
CREATE INDEX "client_lead_type_idx" ON "client_lead"("type");

-- CreateIndex
CREATE INDEX "client_lead_priority_idx" ON "client_lead"("priority");

-- CreateIndex
CREATE INDEX "lead_activity_leadId_idx" ON "lead_activity"("leadId");

-- CreateIndex
CREATE INDEX "lead_activity_activityOn_idx" ON "lead_activity"("activityOn");

-- CreateIndex
CREATE INDEX "lead_activity_activityBy_idx" ON "lead_activity"("activityBy");

-- CreateIndex
CREATE INDEX "conversations_accountId_idx" ON "conversations"("accountId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_key_key" ON "site_content"("key");

-- CreateIndex
CREATE INDEX "site_content_section_idx" ON "site_content"("section");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_accountId_key" ON "user_preferences"("accountId");

-- CreateIndex
CREATE INDEX "visit_requests_propertyId_idx" ON "visit_requests"("propertyId");

-- CreateIndex
CREATE INDEX "visit_requests_agentId_idx" ON "visit_requests"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "sitemaps_url_key" ON "sitemaps"("url");

-- CreateIndex
CREATE INDEX "inquiries_propertyId_idx" ON "inquiries"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_slug_key" ON "team_members"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");

-- CreateIndex
CREATE INDEX "authz_role_capability_role_id_idx" ON "authz_role_capability"("role_id");

-- CreateIndex
CREATE INDEX "authz_role_capability_capability_id_idx" ON "authz_role_capability"("capability_id");

-- CreateIndex
CREATE INDEX "authz_account_access_grant_owner_account_id_idx" ON "authz_account_access_grant"("owner_account_id");

-- CreateIndex
CREATE INDEX "authz_account_access_grant_target_account_id_idx" ON "authz_account_access_grant"("target_account_id");

-- CreateIndex
CREATE INDEX "authz_account_access_grant_role_id_idx" ON "authz_account_access_grant"("role_id");

-- CreateIndex
CREATE INDEX "authz_assets_access_grant_asset_id_idx" ON "authz_assets_access_grant"("asset_id");

-- CreateIndex
CREATE INDEX "authz_assets_access_grant_account_id_idx" ON "authz_assets_access_grant"("account_id");

-- CreateIndex
CREATE INDEX "authz_assets_access_grant_role_id_idx" ON "authz_assets_access_grant"("role_id");

-- CreateIndex
CREATE INDEX "authz_assets_access_grant_portfolio_id_idx" ON "authz_assets_access_grant"("portfolio_id");

-- CreateIndex
CREATE INDEX "authz_assets_access_grant_asset_type_idx" ON "authz_assets_access_grant"("asset_type");

-- CreateIndex
CREATE INDEX "competitor_sources_competitorId_idx" ON "competitor_sources"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_properties_competitorId_idx" ON "competitor_properties"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_properties_source_idx" ON "competitor_properties"("source");

-- CreateIndex
CREATE INDEX "competitor_tracking_competitorPropertyId_idx" ON "competitor_tracking"("competitorPropertyId");

-- CreateIndex
CREATE INDEX "competitor_tracking_ourPropertyId_idx" ON "competitor_tracking"("ourPropertyId");

-- AddForeignKey
ALTER TABLE "property_link" ADD CONSTRAINT "property_link_primaryId_fkey" FOREIGN KEY ("primaryId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_link" ADD CONSTRAINT "property_link_secondaryId_fkey" FOREIGN KEY ("secondaryId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_house_detail" ADD CONSTRAINT "property_house_detail_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_apartment_detail" ADD CONSTRAINT "property_apartment_detail_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_land_detail" ADD CONSTRAINT "property_land_detail_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_commercial_detail" ADD CONSTRAINT "property_commercial_detail_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_price" ADD CONSTRAINT "property_price_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_fetch_history" ADD CONSTRAINT "property_fetch_history_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_document" ADD CONSTRAINT "property_document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_change" ADD CONSTRAINT "property_change_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_map" ADD CONSTRAINT "agency_map_agencyAccountId_fkey" FOREIGN KEY ("agencyAccountId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_customization" ADD CONSTRAINT "agency_customization_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_property" ADD CONSTRAINT "saved_property_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reacted_properties" ADD CONSTRAINT "reacted_properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_link" ADD CONSTRAINT "client_link_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_lead" ADD CONSTRAINT "client_lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "client_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_sources" ADD CONSTRAINT "competitor_sources_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_properties" ADD CONSTRAINT "competitor_properties_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_tracking" ADD CONSTRAINT "competitor_tracking_competitorPropertyId_fkey" FOREIGN KEY ("competitorPropertyId") REFERENCES "competitor_properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
