
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchAgentsByLocationAction } from '@/services/agents';
import { ListingCard } from "@/components/estate";
import { Skeleton } from "@neup/components/ui/skeleton";
import type { Listing, ListingFilters, Agent } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@neup/components/ui/alert";
import { AlertCircle, Search } from "lucide-react";
import { SearchSidebar } from "@/components/estate";
import { Input } from "@neup/components/ui/input";
import { Button } from "@neup/components/ui/button";
import { Pagination } from "@/components/estate";
import { AgentResults } from "@/components/estate";

const PROPERTIES_PER_PAGE = 15;
const basePath = process.env.NEXT_PUBLIC_APP_BASEPATH ?? '';

export function SearchPageContent({ queryFromPath }: { queryFromPath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const page = Number(searchParams.get("page")) || 1;
  const [searchQuery, setSearchQuery] = useState(queryFromPath);

  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<ListingFilters | undefined>(undefined);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchParams: { [key: string]: string | string[] } = {};
    searchParams.forEach((value, key) => {
      if (value && key !== 'page') {
        fetchParams[key] = value;
      }
    });

    fetchParams['offset'] = String((page - 1) * PROPERTIES_PER_PAGE);
    fetchParams['limit'] = String(PROPERTIES_PER_PAGE);

    if (queryFromPath) {
      fetchParams['query'] = queryFromPath;
    }

    async function fetchSearchResults() {
      setIsLoading(true);
      setError(null);
      setListings([]);
      setAgents([]);
      setTotalCount(0);
      
      const searchUrl = new URL(`${basePath}/bridge/api.v1/listings/search`, window.location.origin);
      Object.entries(fetchParams).forEach(([key, value]) => {
        searchUrl.searchParams.set(key, Array.isArray(value) ? value.join(',') : value);
      });

      try {
        const response = await fetch(searchUrl);
        const result = await response.json();
        if (!response.ok || !result.success) {
          setError(result.error || "Failed to load search results.");
          setIsLoading(false);
          return;
        }

        setListings(result.listings);
        setTotalCount(result.totalCount);
        setAppliedFilters(result.appliedFilters);

        if (result.appliedFilters.location) {
          const agentResult = await searchAgentsByLocationAction(result.appliedFilters.location);
          if (agentResult.success && agentResult.data) {
              setAgents(agentResult.data);
          }
        } else {
          setAgents([]);
        }
      } catch {
        setError("Failed to load search results.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSearchResults();
  }, [searchParams, queryFromPath, page]);

  useEffect(() => {
    setSearchQuery(queryFromPath);
  }, [queryFromPath]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Keep sidebar filters when refining the text query, and reset pagination.
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', '1');

    const filterParamsString = newParams.toString();

    if (searchQuery.trim()) {
        router.push(`/search/${encodeURIComponent(searchQuery.trim())}?${filterParamsString}`);
    } else {
        router.push(`/search?${filterParamsString}`);
    }
  };

  const totalPages = Math.ceil(totalCount / PROPERTIES_PER_PAGE);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 md:px-8">
      <div className="grid items-start gap-8 md:grid-cols-[280px_minmax(0,1fr)] md:gap-0">
        <aside className="relative hidden pr-6 md:sticky md:top-20 md:block md:self-start lg:pr-8 before:absolute before:-right-px before:top-0 before:h-full before:w-px before:bg-border/70 before:content-['']">
          <SearchSidebar initialFilters={appliedFilters} />
        </aside>
        <div className="min-w-0 space-y-8 md:pl-8 lg:pl-10">
            <details className="md:hidden">
              <summary className="cursor-pointer px-1 py-2 font-semibold">Refine search</summary>
              <div className="pt-2">
                <SearchSidebar initialFilters={appliedFilters} />
              </div>
            </details>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Input
                  placeholder="Refine your search with natural language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-12"
                />
                <Button
                  htmlType="submit"
                  size="icon"
                  variant="plain"
                  aria-label="Search"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Button>
              </div>
            </form>

            <div className="space-y-8">
              <h2 className="text-2xl font-headline font-bold">
                {isLoading ? 'Searching properties...' : `${totalCount} Properties Found`}
              </h2>

              {isLoading ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[225px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="space-y-6">
                        <Skeleton className="h-8 w-1/3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                        </div>
                    </div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : listings.length > 0 ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {listings.map((property) => (
                            <ListingCard key={property.id} property={property} />
                        ))}
                    </div>
                    {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} />}
                    <AgentResults agents={agents} />
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <h2 className="text-2xl font-semibold">No listings found</h2>
                  <p className="mt-2 text-muted-foreground">
                    Try adjusting your search query or filters.
                  </p>
                </div>
              )}
            </div>
        </div>
      </div>
    </main>
  );
}
