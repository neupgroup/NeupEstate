
import { getAwaitingReviewItems, getPaginatedProperties } from "@/services/property-service";
import { checkAuthenticationForWeb } from "@/services/neupid/check-auth-web";
import { FilePlus2 } from "lucide-react";
import { AdminPropertyDraftRow, AdminPropertyRow } from "@/components/manage/property-row";
import { Pagination } from "@/components/manage/pagination";
import { AdminPropertySearch } from "@/components/manage/admin-property-search";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import type { PropertyFilters } from "@/types";
import { ClientLink } from "@/components/client-link";
import { PERMISSIONS } from "@/logica/auth/permissions";
import { getIdentity } from "@/services/neupid/get-identity";
import { getAgencyAgentMapsByAgent } from "@/services/agency-agent-map-service";
import { hasPermission } from "@/logica/auth/authorization";
import { notFound } from "next/navigation";

const PROPERTIES_PER_PAGE = 10;

export default async function ManagePropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await checkAuthenticationForWeb();
  const identity = await getIdentity();
  const currentAccountId = identity.authenticated ? identity.account.accountId : null;
  const sp = await searchParams ?? {};
  const canViewOwnProperties = await hasPermission(PERMISSIONS.manage.propertySelfView);
  const canViewAllProperties = await hasPermission(PERMISSIONS.root.propertiesView);
  const canViewAllAwaitingReviews = await hasPermission(PERMISSIONS.manage.propertyReviewView);
  if (!canViewOwnProperties && !canViewAllProperties) {
    notFound();
  }

  const currentPage   = Number(sp.page) || 1;
  const query         = sp.q        || '';
  const statusParam   = sp.status   || '';
  const ownerParam    = sp.owner    || '';
  const purposeParam  = sp.purpose  || '';
  const categoryParam = sp.category || '';
  const locationParam = sp.location || '';
  const minPrice      = sp.minPrice    ? Number(sp.minPrice)    : undefined;
  const maxPrice      = sp.maxPrice    ? Number(sp.maxPrice)    : undefined;
  const minBedrooms   = sp.minBedrooms ? Number(sp.minBedrooms) : undefined;
  const minBathrooms  = sp.minBathrooms? Number(sp.minBathrooms): undefined;
  const isDraftsView  = statusParam === 'drafts';
  const isAwaitingReviewView = statusParam === 'pending';

  let filters: PropertyFilters = {};
  if (statusParam && !['drafts', 'pending'].includes(statusParam)) filters.status = statusParam as 'approved' | 'pending';
  if (ownerParam === '1') filters.isOwnerListing = true;
  if (purposeParam)  filters.purpose      = [purposeParam as any];
  if (categoryParam) filters.category     = [categoryParam as any];
  if (locationParam) filters.location     = locationParam;
  if (minPrice)      filters.minPrice     = minPrice;
  if (maxPrice)      filters.maxPrice     = maxPrice;
  if (minBedrooms)   filters.minBedrooms  = minBedrooms;
  if (minBathrooms)  filters.minBathrooms = minBathrooms;

  if (query) {
    const isRecordId = /^c[a-z0-9]{24}$/.test(query);
    if (isRecordId)      { filters.id = query; }
    else {
      try {
        const parsed = await parseAdminFilter({ query });
        filters = { ...parsed, ...filters };
      } catch (e) { console.error("Failed to parse admin filter:", e); }
    }
  }

  const hasFilters = Object.keys(filters).length > 0;
  const isDefaultFeed = !hasFilters && !query && !isDraftsView && !isAwaitingReviewView;
  const agencyLinks = currentAccountId ? (await getAgencyAgentMapsByAgent(currentAccountId)).filter((link) => link.status === 'accepted') : [];
  const agencyIds = agencyLinks.map((link) => link.agencyId);

  const awaitingItems = (isDefaultFeed || isDraftsView || isAwaitingReviewView)
    ? await getAwaitingReviewItems(500, {
        accountId: currentAccountId,
        includeAll: canViewAllAwaitingReviews,
      })
    : [];
  const awaitingReviewIds = isAwaitingReviewView
    ? Array.from(new Set(awaitingItems.map((item) => item.propertyId).filter((id): id is string => Boolean(id))))
    : [];
  const standaloneDrafts = (isDefaultFeed || isDraftsView || isAwaitingReviewView)
    ? awaitingItems.filter((item) => item.kind === 'draft' && !item.propertyId)
    : [];

  if (isAwaitingReviewView) {
    filters.ids = awaitingReviewIds.length ? awaitingReviewIds : ["__no_results__"];
  }

  const paginatedProperties = await getPaginatedProperties({
        page: currentPage,
        limit: PROPERTIES_PER_PAGE,
        filters: hasFilters ? filters : undefined,
        includeInactive: true,
        excludeArchived: true,
        agentAccountId: canViewAllProperties ? undefined : currentAccountId ?? undefined,
        agencyIds: canViewAllProperties ? undefined : agencyIds,
      });
  const properties = paginatedProperties.properties;
  const draftKindsByPropertyId = new Map<string, 'creating' | 'changing' | 'deleting'>();
  for (const item of awaitingItems) {
    if (item.propertyId) draftKindsByPropertyId.set(item.propertyId, item.status as 'creating' | 'changing' | 'deleting');
  }

  const filteredProperties = isDraftsView
    ? properties.filter((property) => draftKindsByPropertyId.has(property.id))
    : properties;
  const totalCount = paginatedProperties.totalCount + standaloneDrafts.length;
  const countLabel = totalCount === 1 ? 'property' : 'properties';
  const totalPages = Math.ceil(totalCount / PROPERTIES_PER_PAGE);
  const defaultPageItems = filteredProperties.slice((currentPage - 1) * PROPERTIES_PER_PAGE, currentPage * PROPERTIES_PER_PAGE);
  const hasAnyRows = defaultPageItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Properties
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilters || query || isDraftsView || isAwaitingReviewView
            ? `Found ${totalCount} ${countLabel}${isAwaitingReviewView ? ' awaiting review' : ''}`
            : `${totalCount} ${countLabel} total`}
        </p>
      </div>

      {/* Search */}
      <AdminPropertySearch />

      {/* List */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">

        {/* "List a Property" — always first, on every page */}
        <ClientLink
          href="/manage/properties/create"
          className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-background group-hover:border-primary transition-colors">
            <FilePlus2 className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
              List a Property
            </p>
            <p className="text-xs text-muted-foreground">
              Add a new property to your listings
            </p>
          </div>
        </ClientLink>

        {/* Property rows */}
        {standaloneDrafts.length > 0 && (
          standaloneDrafts.map((draft) => (
            <div key={draft.id}>
              <div className="border-t border-border" />
              <AdminPropertyDraftRow
                draft={{
                  id: draft.id,
                  propertyId: '',
                  title: draft.title,
                  location: draft.location,
                  category: draft.category,
                  status: (draft.status as 'creating' | 'changing' | 'deleting') ?? 'creating',
                  modifiedOn: draft.modifiedOn ?? new Date().toISOString(),
                }}
              />
            </div>
          ))
        )}
        {defaultPageItems.length > 0 ? (
          defaultPageItems.map((property) => (
            <div key={property.id}>
              <div className="border-t border-border" />
              <AdminPropertyRow
                property={property}
                draftKind={draftKindsByPropertyId.get(property.id)}
              />
            </div>
          ))
        ) : !hasAnyRows && standaloneDrafts.length === 0 ? (
          <div className="border-t border-border">
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {hasFilters || query
                ? "No properties match your filters."
                : "No properties yet. List your first one above."}
            </div>
          </div>
        ) : null}
      </div>

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
    </div>
  );
}
