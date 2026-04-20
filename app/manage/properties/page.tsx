
import { getPaginatedProperties } from "@/services/property-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilePlus2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminPropertyRow } from "@/components/manage/property-row";
import { Pagination } from "@/components/manage/pagination";
import { AdminPropertySearch } from "@/components/manage/admin-property-search";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import type { PropertyFilters } from "@/types";
import { buttonVariants } from "@/components/ui/button";
import { ClientLink } from "@/components/client-link";
import { cn } from "@/lib/utils";

const PROPERTIES_PER_PAGE = 20;

export default async function ManagePropertiesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const query = resolvedSearchParams?.q || '';

  let filters: PropertyFilters | undefined = undefined;
  if (query) {
    let isUrl = false;
    try {
      new URL(query);
      isUrl = true;
    } catch (_) {
      isUrl = false;
    }
    
    const isRecordId = /^c[a-z0-9]{24}$/.test(query);

    if (isRecordId) {
      filters = { id: query };
    } else if (isUrl) {
      filters = { sourceUrl: query };
    } else {
      try {
        filters = await parseAdminFilter({ query });
      } catch(e) {
        console.error("Failed to parse admin filter query:", e);
        // Let it fail gracefully and show all properties.
      }
    }
  }

  const { properties, totalCount } = await getPaginatedProperties({
    page: currentPage,
    limit: PROPERTIES_PER_PAGE,
    filters,
    includeInactive: true,
  });
  const totalPages = Math.ceil(totalCount / PROPERTIES_PER_PAGE);
  
  const description = query 
    ? `Found ${totalCount} ${totalCount === 1 ? 'property' : 'properties'} matching your search.`
    : `Showing ${Math.min(PROPERTIES_PER_PAGE, totalCount)} of ${totalCount} properties.`;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Property Management</h2>
            <p className="text-sm text-muted-foreground">
                {description}
            </p>
        </div>
        <ClientLink href="/manage/properties/create" className={buttonVariants()}>
            <FilePlus2 className="mr-2 h-4 w-4"/>
            Create Property
        </ClientLink>
      </div>
      <div>
        <AdminPropertySearch />
        <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Quick Filters:</span>
            <ClientLink 
                href="/manage/properties?q=pending" 
                className={cn(buttonVariants({ variant: query === 'pending' ? 'secondary' : 'outline', size: 'sm' }), "h-7 px-2")}>
                Awaiting Review
            </ClientLink>
            <ClientLink 
                href="/manage/properties?q=owner listing" 
                className={cn(buttonVariants({ variant: query === 'owner listing' ? 'secondary' : 'outline', size: 'sm' }), "h-7 px-2")}>
                Owner Properties
            </ClientLink>
            {query && (
                <ClientLink href="/manage/properties" className={buttonVariants({ variant: 'link', size: 'sm' })}>
                    Clear
                </ClientLink>
            )}
        </div>
        {totalCount > 0 ? (
          <>
            <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {properties.map((property) => (
                      <AdminPropertyRow key={property.id} property={property} />
                  ))}
              </TableBody>
            </Table>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
          </>
        ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Properties Found</AlertTitle>
                <AlertDescription>
                   {query 
                    ? "Your search returned no results. Try adjusting your query."
                    : "No properties were found in the database. You can add one by clicking the button above or by adding a sitemap in the automation page. If you believe this is an error, please ensure your database connection is configured correctly."
                   }
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
