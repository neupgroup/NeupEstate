"use client";

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/core/utils';
import { PriceInput } from '@/components/ui/price-input';

// ─── Quick filter definitions ─────────────────────────────────────────────────

const QUICK_FILTERS: { label: string; params: Record<string, string> }[] = [
    { label: "Creation Drafts", params: { status: "creation_drafts" } },
    { label: "Change Drafts",   params: { status: "changes_drafts" } },
    { label: "Active",          params: { status: "active" } },
    { label: "For Sale",        params: { purpose: "sale" } },
    { label: "For Rent",        params: { purpose: "rent" } },
    { label: "Owner",           params: { sellerType: "owner" } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isQuickFilterActive(
    params: Record<string, string>,
    searchParams: URLSearchParams
): boolean {
    return Object.entries(params).every(([k, v]) => searchParams.get(k) === v);
}

// ─── Component ────────────────────────────────────────────────────────────────

/*
::neup.documentation::manage-property-search-filter-params

::private

The manage property filter UI emits URL params that match the management route
contract directly: `status=creation_drafts|changes_drafts|active`,
`purpose=sale|rent`, `sellerType=owner|representative`, `fromAgency=0|1`, and
`propertyType=house|land|apartment`. It preserves `brand=<accountId>` and
`account=<accountId>` when the page is opened from an account detail "View all"
link.

::private end
::end
*/
export function AdminPropertySearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [query, setQuery]       = useState(searchParams.get('q') || '');
    const [advanced, setAdvanced] = useState(false);

    // Advanced filter local state — initialised from URL
    const [minPrice, setMinPrice]   = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice]   = useState(searchParams.get('maxPrice') || '');
    const [location, setLocation]   = useState(searchParams.get('location') || '');
    const [status, setStatus]       = useState(searchParams.get('status') || '');
    const [purpose, setPurpose]     = useState(searchParams.get('purpose') || '');
    const [sellerType, setSellerType] = useState(searchParams.get('sellerType') || '');
    const [fromAgency, setFromAgency] = useState(searchParams.get('fromAgency') || '');
    const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || '');
    const [bedrooms, setBedrooms]   = useState(searchParams.get('minBedrooms') || '');
    const [bathrooms, setBathrooms] = useState(searchParams.get('minBathrooms') || '');

    function preserveScopedParams(params: URLSearchParams) {
        const brand = searchParams.get('brand');
        const account = searchParams.get('account');
        if (brand) params.set('brand', brand);
        if (account) params.set('account', account);
    }

    function buildParams(overrides: Record<string, string | undefined> = {}): string {
        const p = new URLSearchParams();
        preserveScopedParams(p);
        // Carry over q
        const q = overrides.q !== undefined ? overrides.q : query.trim();
        if (q) p.set('q', q);
        // Advanced filters
        const mp  = overrides.minPrice  !== undefined ? overrides.minPrice  : minPrice;
        const xp  = overrides.maxPrice  !== undefined ? overrides.maxPrice  : maxPrice;
        const loc = overrides.location  !== undefined ? overrides.location  : location;
        const st  = overrides.status    !== undefined ? overrides.status    : status;
        const pu  = overrides.purpose   !== undefined ? overrides.purpose   : purpose;
        const se  = overrides.sellerType !== undefined ? overrides.sellerType : sellerType;
        const fa  = overrides.fromAgency !== undefined ? overrides.fromAgency : fromAgency;
        const pt  = overrides.propertyType !== undefined ? overrides.propertyType : propertyType;
        const bd  = overrides.bedrooms  !== undefined ? overrides.bedrooms  : bedrooms;
        const ba  = overrides.bathrooms !== undefined ? overrides.bathrooms : bathrooms;
        if (mp)  p.set('minPrice', mp);
        if (xp)  p.set('maxPrice', xp);
        if (loc) p.set('location', loc);
        if (st)  p.set('status', st);
        if (pu)  p.set('purpose', pu);
        if (se)  p.set('sellerType', se);
        if (fa)  p.set('fromAgency', fa);
        if (pt)  p.set('propertyType', pt);
        if (bd)  p.set('minBedrooms', bd);
        if (ba)  p.set('minBathrooms', ba);
        return p.toString();
    }

    function navigate(params: string) {
        router.push(`${pathname}${params ? `?${params}` : ''}`);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        navigate(buildParams());
    }

    function handleClear() {
        setQuery('');
        setMinPrice(''); setMaxPrice(''); setLocation('');
        setStatus(''); setPurpose(''); setSellerType(''); setFromAgency(''); setPropertyType('');
        setBedrooms(''); setBathrooms('');
        const p = new URLSearchParams();
        preserveScopedParams(p);
        navigate(p.toString());
    }

    function applyQuickFilter(params: Record<string, string>) {
        const p = new URLSearchParams();
        preserveScopedParams(p);
        if (query.trim()) p.set('q', query.trim());
        Object.entries(params).forEach(([k, v]) => p.set(k, v));
        // Sync local state
        if (params.status)  setStatus(params.status);
        if (params.purpose) setPurpose(params.purpose);
        if (params.sellerType) setSellerType(params.sellerType);
        navigate(p.toString());
    }

    function applyAdvanced() {
        navigate(buildParams());
    }

    function clearAdvanced() {
        setMinPrice(''); setMaxPrice(''); setLocation('');
        setStatus(''); setPurpose(''); setSellerType(''); setFromAgency(''); setPropertyType('');
        setBedrooms(''); setBathrooms('');
        navigate(buildParams({
            minPrice: '', maxPrice: '', location: '',
            status: '', purpose: '', sellerType: '', fromAgency: '', propertyType: '',
            bedrooms: '', bathrooms: '',
        }));
    }

    const hasAdvancedFilters = !!(minPrice || maxPrice || location || status || purpose || sellerType || fromAgency || propertyType || bedrooms || bathrooms);

    return (
        <div className="space-y-2">
            {/* Search bar */}
            <form onSubmit={handleSearch}>
                <div className="relative flex items-center">
                    {/* Search icon — left side, non-interactive */}
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

                    <Input
                        placeholder="Search properties…"
                        className="w-full pl-10 pr-20"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />

                    {/* Right side: clear + advanced */}
                    <div className="absolute right-1 flex items-center gap-0.5">
                        {query && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleClear}
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Clear</span>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setAdvanced(v => !v)}
                            className={cn(
                                "h-8 w-8",
                                (advanced || hasAdvancedFilters) && "text-primary"
                            )}
                            title="Advanced filters"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="sr-only">Advanced filters</span>
                        </Button>
                    </div>
                </div>
            </form>

            {/* Quick filters — always visible below search */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {QUICK_FILTERS.map(f => {
                    const active = isQuickFilterActive(f.params, searchParams);
                    return (
                        <button
                            key={f.label}
                            type="button"
                            onClick={() => applyQuickFilter(f.params)}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                            )}
                        >
                            {f.label}
                        </button>
                    );
                })}
                {(searchParams.toString() || hasAdvancedFilters) && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Advanced filter panel */}
            {advanced && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                            <select
                                title="Filter by status"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Any</option>
                                <option value="creation_drafts">Creation Drafts</option>
                                <option value="changes_drafts">Change Drafts</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        {/* Purpose */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Purpose</label>
                            <select
                                title="Filter by purpose"
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Any</option>
                                <option value="sale">Sale</option>
                                <option value="rent">Rent</option>
                            </select>
                        </div>

                        {/* Seller type */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Seller Type</label>
                            <select
                                title="Filter by seller type"
                                value={sellerType}
                                onChange={e => setSellerType(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Any</option>
                                <option value="representative">Representative</option>
                                <option value="owner">Owner</option>
                            </select>
                        </div>

                        {/* From agency */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">From Agency</label>
                            <select
                                title="Filter by agency source"
                                value={fromAgency}
                                onChange={e => setFromAgency(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Any</option>
                                <option value="1">Yes</option>
                                <option value="0">No</option>
                            </select>
                        </div>

                        {/* Property type */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Property Type</label>
                            <select
                                title="Filter by property type"
                                value={propertyType}
                                onChange={e => setPropertyType(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Any</option>
                                <option value="house">House</option>
                                <option value="land">Land</option>
                                <option value="apartment">Apartment</option>
                            </select>
                        </div>

                        {/* Location */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Location</label>
                            <Input
                                placeholder="e.g. Kathmandu"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>

                        {/* Min price */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Min Price</label>
                            <PriceInput
                                placeholder="0"
                                value={minPrice}
                                onChange={setMinPrice}
                                className="h-8 text-sm"
                            />
                        </div>

                        {/* Max price */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Max Price</label>
                            <PriceInput
                                placeholder="Any"
                                value={maxPrice}
                                onChange={setMaxPrice}
                                className="h-8 text-sm"
                            />
                        </div>

                        {/* Bedrooms */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Min Bedrooms</label>
                            <Input
                                type="number"
                                placeholder="Any"
                                value={bedrooms}
                                onChange={e => setBedrooms(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>

                        {/* Bathrooms */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Min Bathrooms</label>
                            <Input
                                type="number"
                                placeholder="Any"
                                value={bathrooms}
                                onChange={e => setBathrooms(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                        <Button type="button" size="sm" onClick={applyAdvanced}>
                            Apply Filters
                        </Button>
                        {hasAdvancedFilters && (
                            <Button type="button" size="sm" variant="ghost" onClick={clearAdvanced}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
