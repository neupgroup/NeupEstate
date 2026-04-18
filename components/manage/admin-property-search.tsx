
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export function AdminPropertySearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
            params.set('q', query.trim());
        } else {
            params.delete('q');
        }
        // Reset page to 1 for new search
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };
    
    const handleClear = () => {
        setQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
                <Input 
                    placeholder="Search with natural language (e.g., 'pending rentals') or paste a source URL"
                    className="w-full pr-20" // padding for clear and search buttons
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                 {query && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear search</span>
                    </Button>
                )}
                 <Button 
                    type="submit" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Search</span>
                </Button>
            </div>
        </form>
    );
}
