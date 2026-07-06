
import { getAwaitingReviewItems, getPaginatedProperties, getPropertyDrafts } from "@/services/property-service";
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
const CREATION_DRAFT_STATUSES = new Set(['creation_draft', 'creation_pending']);
const CHANGE_DRAFT_STATUSES = new Set(['changing', 'deleting']);

function normalizePurposeFilter(value: string | undefined): 'Sale' | 'Rent' | 'Lease' | '' {
  const normalized = value?.trim().toLowerCase() || '';
  if (normalized === 'sale') return 'Sale';
  if (normalized === 'rent') return 'Rent';
  if (normalized === 'lease') return 'Lease';
  return '';
}

function normalizePropertyTypeFilter(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() || '';
  if (normalized === 'house') return 'House';
  if (normalized === 'land') return 'Land';
  if (normalized === 'apartment') return 'Apartment';
  return '';
}

/*
::neup.documentation::manage-properties-page-current-user-drafts

::private

The manage properties index always surfaces the current account's in-progress
creation flow from `property_changes`, including partial step-by-step drafts
that do not yet have a live `property` row. Review queues still use the broader
awaiting-review source separately. Filtered views count and paginate the same
result set they render, so status tabs do not report broader property totals.
Users with `manage.propertyReviewView` can open the pending queue across all
accounts even when they do not have the broader root properties permission. The
same permission also extends the default unfiltered manage-properties feed with
awaiting-creation rows from other accounts when those rows still exist only in
`property_changes`.
The `brand=<accountId>` URL param scopes the feed to listings whose property
`agency` field matches that brand account. The `account=<accountId>` URL param
scopes the feed to listings whose property `agent` field matches that agent
account. Non-root users can only request brands they are mapped to or their own
account.

::private end
::end
*/
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

  const currentPage   = Number(sp.page) || 1;
  const query         = sp.q        || '';
  const statusParam   = sp.status   || '';
  const sellerTypeParam = sp.sellerType || '';
  const fromAgencyParam = sp.fromAgency || '';
  const brandParam    = sp.brand?.trim() || '';
  const accountParam  = sp.account?.trim() || '';
  const purposeParam  = normalizePurposeFilter(sp.purpose);
  const propertyTypeParam = normalizePropertyTypeFilter(sp.propertyType);
  const locationParam = sp.location || '';
  const minPrice      = sp.minPrice    ? Number(sp.minPrice)    : undefined;
  const maxPrice      = sp.maxPrice    ? Number(sp.maxPrice)    : undefined;
  const minBedrooms   = sp.minBedrooms ? Number(sp.minBedrooms) : undefined;
  const minBathrooms  = sp.minBathrooms? Number(sp.minBathrooms): undefined;
  const isCreationDraftsView = statusParam === 'creation_drafts';
  const isChangeDraftsView = statusParam === 'changes_drafts';
  const isActiveView = statusParam === 'active';
  if (!canViewOwnProperties && !canViewAllProperties && !canViewAllAwaitingReviews) {
    notFound();
  }

  let filters: PropertyFilters = {};
  if (isActiveView) filters.status = 'approved';
  if (sellerTypeParam === 'owner') filters.isOwnerListing = true;
  if (sellerTypeParam === 'representative') filters.isOwnerListing = false;
  if (fromAgencyParam === '0') filters.isOwnerListing = true;
  if (fromAgencyParam === '1') filters.isOwnerListing = false;
  if (purposeParam)  filters.purpose      = [purposeParam as any];
  if (propertyTypeParam) filters.category = [propertyTypeParam as any];
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

  const userDrafts = currentAccountId
    ? await getPropertyDrafts(currentAccountId)
    : [];
  const creationFlowDrafts = userDrafts.filter((draft) => CREATION_DRAFT_STATUSES.has(draft.status));
  const changeFlowDrafts = userDrafts.filter((draft) => CHANGE_DRAFT_STATUSES.has(draft.status));
  const creationFlowDraftPropertyIds = new Set(
    creationFlowDrafts
      .map((draft) => draft.propertyId)
      .filter((id): id is string => Boolean(id)),
  );
  const changeFlowDraftPropertyIds = new Set(
    changeFlowDrafts
      .map((draft) => draft.propertyId)
      .filter((id): id is string => Boolean(id)),
  );

  if (isChangeDraftsView) {
    const changeDraftPropertyIds = Array.from(changeFlowDraftPropertyIds);
    filters.ids = changeDraftPropertyIds.length ? changeDraftPropertyIds : ["__no_results__"];
  }

  const hasBaseFilters = Object.keys(filters).length > 0;
  const isDefaultFeed = !hasBaseFilters && !query && !statusParam;
  const shouldIncludeAwaitingReviewFeed = canViewAllAwaitingReviews && (statusParam === 'pending' || isDefaultFeed);
  const canUseGlobalPropertyScope = canViewAllProperties || shouldIncludeAwaitingReviewFeed;
  const agencyLinks = currentAccountId ? (await getAgencyAgentMapsByAgent(currentAccountId)).filter((link) => link.status === 'accepted') : [];
  const agencyIds = agencyLinks.map((link) => link.agencyId);
  const hasConflictingScopeParams = Boolean(brandParam && accountParam);
  const scopedAgencyIds = hasConflictingScopeParams
    ? ['__no_results__']
    : canUseGlobalPropertyScope
      ? (brandParam ? [brandParam] : undefined)
      : brandParam
        ? (agencyIds.includes(brandParam) ? [brandParam] : ['__no_results__'])
        : agencyIds;
  const scopedAgentAccountId = hasConflictingScopeParams
    ? '__no_results__'
    : canUseGlobalPropertyScope
      ? accountParam || undefined
      : accountParam
        ? (accountParam === currentAccountId ? accountParam : '__no_results__')
        : currentAccountId ?? undefined;
  const awaitingItems = shouldIncludeAwaitingReviewFeed
    ? await getAwaitingReviewItems(500, {
        accountId: currentAccountId,
        includeAll: canViewAllAwaitingReviews,
      })
    : [];
  const awaitingReviewIds = statusParam === 'pending'
    ? Array.from(new Set(awaitingItems.map((item) => item.propertyId).filter((id): id is string => Boolean(id))))
    : [];
  const awaitingDraftRows = awaitingItems
    .filter((item) => item.kind === 'draft' && (!item.propertyId || item.status === 'creation_pending' || item.status === 'creation_draft'))
    .map((item) => ({
      id: item.id,
      propertyId: item.propertyId,
      title: item.title,
      location: item.location,
      category: item.category,
      status: item.status as 'creation_draft' | 'creation_pending' | 'changing' | 'deleting',
      modifiedOn: item.modifiedOn,
    }));
  if (statusParam === 'pending') {
    filters.ids = awaitingReviewIds.length ? awaitingReviewIds : ["__no_results__"];
  }
  const hasFilters = Object.keys(filters).length > 0;

  const paginatedProperties = await getPaginatedProperties({
        page: currentPage,
        limit: PROPERTIES_PER_PAGE,
        filters: hasFilters ? filters : undefined,
        includeInactive: true,
        excludeArchived: true,
        agentAccountId: hasConflictingScopeParams ? '__no_results__' : brandParam ? undefined : scopedAgentAccountId,
        agencyIds: hasConflictingScopeParams ? undefined : accountParam ? undefined : scopedAgencyIds,
      });
  const properties = paginatedProperties.properties;
  const draftKindsByPropertyId = new Map<string, 'creation_draft' | 'creation_pending' | 'changing' | 'deleting'>();
  for (const draft of userDrafts) {
    if (draft.propertyId) draftKindsByPropertyId.set(draft.propertyId, draft.status);
  }
  for (const item of awaitingItems) {
    if (item.propertyId && item.status) {
      draftKindsByPropertyId.set(item.propertyId, item.status as 'creation_draft' | 'creation_pending' | 'changing' | 'deleting');
    }
  }
  const defaultFeedDraftRows = isDefaultFeed
    ? Array.from(
        new Map(
          [...awaitingDraftRows, ...creationFlowDrafts].map((draft) => [draft.id, draft]),
        ).values(),
      )
    : [];
  const defaultFeedDraftPropertyIds = new Set(
    defaultFeedDraftRows
      .map((draft) => draft.propertyId)
      .filter((id): id is string => Boolean(id)),
  );
  const pendingDraftPropertyIds = new Set(
    awaitingDraftRows
      .map((draft) => draft.propertyId)
      .filter((id): id is string => Boolean(id)),
  );

  const draftRows = isCreationDraftsView
    ? creationFlowDrafts
    : isChangeDraftsView
      ? changeFlowDrafts
      : statusParam === 'pending'
        ? awaitingDraftRows
      : isDefaultFeed
        ? defaultFeedDraftRows
        : [];
  const filteredProperties = isCreationDraftsView
    ? []
    : isChangeDraftsView
      ? []
      : statusParam === 'pending'
        ? properties.filter((property) => !pendingDraftPropertyIds.has(property.id))
        : isDefaultFeed
          ? properties.filter((property) => !defaultFeedDraftPropertyIds.has(property.id))
          : properties.filter((property) => !creationFlowDraftPropertyIds.has(property.id));
  const totalCount = isCreationDraftsView
    ? draftRows.length
    : isChangeDraftsView
      ? draftRows.length
      : statusParam === 'pending'
        ? paginatedProperties.totalCount + awaitingDraftRows.length
      : isDefaultFeed
        ? paginatedProperties.totalCount + defaultFeedDraftRows.length - defaultFeedDraftPropertyIds.size
        : paginatedProperties.totalCount;
  const countLabel = totalCount === 1 ? 'property' : 'properties';
  const totalPages = Math.ceil(totalCount / PROPERTIES_PER_PAGE);
  const defaultPageItems = filteredProperties;
  const hasAnyRows = defaultPageItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Properties
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilters || query || isCreationDraftsView || isChangeDraftsView || statusParam === 'pending' || isActiveView
            ? `Found ${totalCount} ${countLabel}${statusParam === 'pending' ? ' awaiting review' : ''}`
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
        {draftRows.length > 0 && (
          draftRows.map((draft) => (
            <div key={draft.id}>
              <div className="border-t border-border" />
              <AdminPropertyDraftRow
                draft={{
                  id: draft.id,
                  propertyId: draft.propertyId,
                  title: draft.title,
                  location: draft.location,
                  category: draft.category,
                  status: (draft.status as 'creation_draft' | 'creation_pending' | 'changing' | 'deleting') ?? 'creation_draft',
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
        ) : !hasAnyRows && draftRows.length === 0 ? (
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
