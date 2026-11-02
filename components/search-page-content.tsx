
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchProperties } from '@/services/properties/search';
import { searchAgentsByLocationAction } from '@/services/agents';
import { PropertyCard } from "@/components/estate";
import { Skeleton } from "@neup/components/ui/skeleton";
import type { Property, PropertyFilters, Agent } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@neup/components/ui/alert";
import { AlertCircle, Search } from "lucide-react";
import { SearchSidebar } from "@/components/estate";
import { Input } from "@neup/components/ui/input";
import { Button } from "@neup/components/ui/button";
import { Pagination } from "@/components/estate";
import { AgentResults } from "@/components/estate";

const PROPERTIES_PER_PAGE = 18;

export function SearchPageContent({ queryFromPath }: { queryFromPath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const page = Number(searchParams.get("page")) || 1;
  const [searchQuery, setSearchQuery] = useState(queryFromPath);

  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<PropertyFilters | undefined>(undefined);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchParams: { [key: string]: string | string[] } = {};
    searchParams.forEach((value, key) => {
      if (value) {
        fetchParams[key] = value;
      }
    });

    if (queryFromPath) {
      fetchParams['q'] = queryFromPath;
    }

    async function fetchSearchResults() {
      setIsLoading(true);
      setError(null);
      setProperties([]);
      setAgents([]);
      setTotalCount(0);
      
      const result = await searchProperties(fetchParams);
      if (result.success && result.data) {
        setProperties(result.data.properties);
        setTotalCount(result.data.totalCount);
        setAppliedFilters(result.data.appliedFilters);

        if (result.data.appliedFilters.location) {
          const agentResult = await searchAgentsByLocationAction(result.data.appliedFilters.location);
          if (agentResult.success && agentResult.data) {
              setAgents(agentResult.data);
          }
        } else {
          setAgents([]);
        }
      } else {
        setError(result.error || "Failed to load search results.");
      }
      setIsLoading(false);
    }
    fetchSearchResults();
  }, [searchParams, queryFromPath]);

  useEffect(() => {
    setSearchQuery(queryFromPath);
  }, [queryFromPath]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set('page', '1');
    
    // When doing a new text search, we clear old filters from the URL to avoid confusion.
    const newParams = new URLSearchParams();
    newParams.set('page', currentParams.get('page')!);

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
        <aside className="hidden pr-6 md:sticky md:top-20 md:block md:self-start lg:pr-8">
          <SearchSidebar initialFilters={appliedFilters} />
        </aside>
        <div className="min-w-0 space-y-8 md:border-l md:border-border/70 md:pl-8 lg:pl-10">
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
              ) : properties.length > 0 ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {properties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))}
                    </div>
                    {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} />}
                    <AgentResults agents={agents} />
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <h2 className="text-2xl font-semibold">No properties found</h2>
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
