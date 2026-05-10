"use client";

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Quick filter definitions ─────────────────────────────────────────────────

const QUICK_FILTERS: { label: string; params: Record<string, string> }[] = [
    { label: "Awaiting Review", params: { status: "pending" } },
    { label: "Active",          params: { status: "approved" } },
    { label: "Owner Listings",  params: { owner: "1" } },
    { label: "For Sale",        params: { purpose: "Sale" } },
    { label: "For Rent",        params: { purpose: "Rent" } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isQuickFilterActive(
    params: Record<string, string>,
    searchParams: URLSearchParams
): boolean {
    return Object.entries(params).every(([k, v]) => searchParams.get(k) === v);
}

// ─── Component ────────────────────────────────────────────────────────────────

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
    const [category, setCategory]   = useState(searchParams.get('category') || '');
    const [bedrooms, setBedrooms]   = useState(searchParams.get('minBedrooms') || '');
    const [bathrooms, setBathrooms] = useState(searchParams.get('minBathrooms') || '');

    function buildParams(overrides: Record<string, string | undefined> = {}): string {
        const p = new URLSearchParams();
        // Carry over q
        const q = overrides.q !== undefined ? overrides.q : query.trim();
        if (q) p.set('q', q);
        // Advanced filters
        const mp  = overrides.minPrice  !== undefined ? overrides.minPrice  : minPrice;
        const xp  = overrides.maxPrice  !== undefined ? overrides.maxPrice  : maxPrice;
        const loc = overrides.location  !== undefined ? overrides.location  : location;
        const st  = overrides.status    !== undefined ? overrides.status    : status;
        const pu  = overrides.purpose   !== undefined ? overrides.purpose   : purpose;
        const ca  = overrides.category  !== undefined ? overrides.category  : category;
        const bd  = overrides.bedrooms  !== undefined ? overrides.bedrooms  : bedrooms;
        const ba  = overrides.bathrooms !== undefined ? overrides.bathrooms : bathrooms;
        if (mp)  p.set('minPrice', mp);
        if (xp)  p.set('maxPrice', xp);
        if (loc) p.set('location', loc);
        if (st)  p.set('status', st);
        if (pu)  p.set('purpose', pu);
        if (ca)  p.set('category', ca);
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
        setStatus(''); setPurpose(''); setCategory('');
        setBedrooms(''); setBathrooms('');
        navigate('');
    }

    function applyQuickFilter(params: Record<string, string>) {
        const p = new URLSearchParams();
        if (query.trim()) p.set('q', query.trim());
        Object.entries(params).forEach(([k, v]) => p.set(k, v));
        // Sync local state
        if (params.status)  setStatus(params.status);
        if (params.purpose) setPurpose(params.purpose);
        navigate(p.toString());
    }

    function applyAdvanced() {
        navigate(buildParams());
    }

    function clearAdvanced() {
        setMinPrice(''); setMaxPrice(''); setLocation('');
        setStatus(''); setPurpose(''); setCategory('');
        setBedrooms(''); setBathrooms('');
        navigate(buildParams({
            minPrice: '', maxPrice: '', location: '',
            status: '', purpose: '', category: '',
            bedrooms: '', bathrooms: '',
        }));
    }

    const hasAdvancedFilters = !!(minPrice || maxPrice || location || status || purpose || category || bedrooms || bathrooms);

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
                                <option value="approved">Active</option>
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
                                <option value="Sale">Sale</option>
                                <option value="Rent">Rent</option>
                                <option value="Lease">Lease</option>
                            </select>
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Category</label>
                            <select
                                title="Filter by category"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Any</option>
                                <option value="House">House</option>
                                <option value="Apartment">Apartment</option>
                                <option value="Land">Land</option>
                                <option value="Commercial Space">Commercial</option>
                                <option value="Flat">Flat</option>
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
                            <Input
                                type="number"
                                placeholder="0"
                                value={minPrice}
                                onChange={e => setMinPrice(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>

                        {/* Max price */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Max Price</label>
                            <Input
                                type="number"
                                placeholder="Any"
                                value={maxPrice}
                                onChange={e => setMaxPrice(e.target.value)}
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
