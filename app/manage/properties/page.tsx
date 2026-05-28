
import { getPaginatedProperties } from "@/services/property-service";
import { checkAuthenticationForWeb, getAccountIdFromJWT } from "@/services/neupid/check-auth-web";
import { AlertCircle, FilePlus2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminPropertyRow } from "@/components/manage/property-row";
import { Pagination } from "@/components/manage/pagination";
import { AdminPropertySearch } from "@/components/manage/admin-property-search";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import type { PropertyFilters } from "@/types";
import { ClientLink } from "@/components/client-link";
import { requirePagePermission } from "@/logica/auth/page-guard";
import { PERMISSIONS } from "@/logica/auth/permissions";

const PROPERTIES_PER_PAGE = 10;

export default async function ManagePropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await requirePagePermission(PERMISSIONS.manage.propertySelfView);
  await checkAuthenticationForWeb();
  const accountId = await getAccountIdFromJWT();
  const sp = await searchParams ?? {};

  const currentPage   = Number(sp.page) || 1;
  const query         = sp.q        || '';
  const statusParam   = sp.status   || '';
  const purposeParam  = sp.purpose  || '';
  const categoryParam = sp.category || '';
  const locationParam = sp.location || '';
  const minPrice      = sp.minPrice    ? Number(sp.minPrice)    : undefined;
  const maxPrice      = sp.maxPrice    ? Number(sp.maxPrice)    : undefined;
  const minBedrooms   = sp.minBedrooms ? Number(sp.minBedrooms) : undefined;
  const minBathrooms  = sp.minBathrooms? Number(sp.minBathrooms): undefined;

  let filters: PropertyFilters = {};
  if (statusParam)   filters.status       = statusParam as 'approved' | 'pending';
  if (purposeParam)  filters.purpose      = [purposeParam as any];
  if (categoryParam) filters.category     = [categoryParam as any];
  if (locationParam) filters.location     = locationParam;
  if (minPrice)      filters.minPrice     = minPrice;
  if (maxPrice)      filters.maxPrice     = maxPrice;
  if (minBedrooms)   filters.minBedrooms  = minBedrooms;
  if (minBathrooms)  filters.minBathrooms = minBathrooms;

  if (query) {
    let isUrl = false;
    try { new URL(query); isUrl = true; } catch (_) {}
    const isRecordId = /^c[a-z0-9]{24}$/.test(query);
    if (isRecordId)      { filters.id = query; }
    else if (isUrl)      { filters.sourceUrl = query; }
    else {
      try {
        const parsed = await parseAdminFilter({ query });
        filters = { ...parsed, ...filters };
      } catch (e) { console.error("Failed to parse admin filter:", e); }
    }
  }

  const hasFilters = Object.keys(filters).length > 0;

  const { properties, totalCount } = await getPaginatedProperties({
    page: currentPage,
    limit: PROPERTIES_PER_PAGE,
    filters: hasFilters ? filters : undefined,
    includeInactive: true,
    ownerAccountId: accountId ?? undefined,
  });
  const totalPages = Math.ceil(totalCount / PROPERTIES_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Properties</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hasFilters || query
            ? `Found ${totalCount} ${totalCount === 1 ? 'property' : 'properties'}`
            : `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} total`}
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
        {properties.length > 0 ? (
          properties.map(property => (
            <div key={property.id}>
              <div className="border-t border-border" />
              <AdminPropertyRow property={property} />
            </div>
          ))
        ) : (
          <div className="border-t border-border">
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {hasFilters || query
                ? "No properties match your filters."
                : "No properties yet. List your first one above."}
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
    </div>
  );
}
