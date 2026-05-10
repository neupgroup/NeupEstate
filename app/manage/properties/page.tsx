
import { getPaginatedProperties } from "@/services/property-service";
import { checkAuthenticationForWeb, getAccountIdFromJWT } from "@/services/neupid/check-auth-web";
import { FilePlus2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminPropertyRow } from "@/components/manage/property-row";
import { Pagination } from "@/components/manage/pagination";
import { AdminPropertySearch } from "@/components/manage/admin-property-search";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import type { PropertyFilters } from "@/types";
import { buttonVariants } from "@/components/ui/button";
import { ClientLink } from "@/components/client-link";

const PROPERTIES_PER_PAGE = 20;

export default async function ManagePropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  await checkAuthenticationForWeb();
  const accountId = await getAccountIdFromJWT();
  const sp = await searchParams ?? {};

  const currentPage  = Number(sp.page) || 1;
  const query        = sp.q        || '';
  const statusParam  = sp.status   || '';   // 'approved' | 'pending'
  const purposeParam = sp.purpose  || '';
  const categoryParam= sp.category || '';
  const locationParam= sp.location || '';
  const minPrice     = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice     = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const minBedrooms  = sp.minBedrooms  ? Number(sp.minBedrooms)  : undefined;
  const minBathrooms = sp.minBathrooms ? Number(sp.minBathrooms) : undefined;

  // Build filters — start from URL params, then overlay AI-parsed query
  let filters: PropertyFilters = {};

  // Direct URL params
  if (statusParam)   filters.status    = statusParam as 'approved' | 'pending';
  if (purposeParam)  filters.purpose   = [purposeParam as any];
  if (categoryParam) filters.category  = [categoryParam as any];
  if (locationParam) filters.location  = locationParam;
  if (minPrice)      filters.minPrice  = minPrice;
  if (maxPrice)      filters.maxPrice  = maxPrice;
  if (minBedrooms)   filters.minBedrooms  = minBedrooms;
  if (minBathrooms)  filters.minBathrooms = minBathrooms;

  // Natural language / URL / ID query
  if (query) {
    let isUrl = false;
    try { new URL(query); isUrl = true; } catch (_) {}
    const isRecordId = /^c[a-z0-9]{24}$/.test(query);

    if (isRecordId) {
      filters.id = query;
    } else if (isUrl) {
      filters.sourceUrl = query;
    } else {
      try {
        const parsed = await parseAdminFilter({ query });
        // Merge — URL params take precedence over AI-parsed values
        filters = { ...parsed, ...filters };
      } catch (e) {
        console.error("Failed to parse admin filter query:", e);
      }
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

  const description = hasFilters || query
    ? `Found ${totalCount} ${totalCount === 1 ? 'property' : 'properties'}`
    : `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} total`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Properties</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <ClientLink href="/manage/properties/create" className={buttonVariants()}>
          <FilePlus2 className="mr-2 h-4 w-4" />
          Create Property
        </ClientLink>
      </div>

      {/* Search + quick filters + advanced panel — all inside the component */}
      <AdminPropertySearch />

      {/* Property list */}
      {totalCount > 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            {properties.map((property, i) => (
              <div key={property.id}>
                <AdminPropertyRow property={property} />
                {i < properties.length - 1 && (
                  <div className="border-t border-border" />
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Properties Found</AlertTitle>
          <AlertDescription>
            {hasFilters || query
              ? "No properties match your filters. Try adjusting or clearing them."
              : "No properties yet. Create one using the button above."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
