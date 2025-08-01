
"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function SearchSection() {
    const router = useRouter();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const query = formData.get('q') as string;
        if (query && query.trim()) {
            router.push(`/search/${encodeURIComponent(query.trim())}`);
        } else {
            router.push('/search');
        }
    };

    return (
        <div className="relative bg-cover bg-center py-24 md:py-40" style={{ backgroundImage: "url('https://archello.s3.eu-central-1.amazonaws.com/images/2020/07/23/comelite-architecture-structure-and-interior-design-modern-classic-home-design-private-houses-archello.1595530130.3518.jpg')" }} data-ai-hint="modern classic home">
            <div className="absolute inset-0 bg-black/60" />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white font-headline tracking-tight">Find Your Next Home</h1>
                    <p className="mt-4 text-xl text-gray-200">The best place to find your dream property.</p>
                </div>
                
                <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
                    <div className="relative">
                        <Input 
                            name="q"
                            placeholder="e.g., 'a 3-bedroom house in Brooklyn with a backyard'"
                            className="h-14 pl-5 pr-14 text-base rounded-full shadow-lg"
                        />
                        <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full">
                            <Search className="h-5 w-5" />
                            <span className="sr-only">Search</span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
