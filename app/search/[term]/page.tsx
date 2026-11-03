
import { Suspense } from "react";
import { SearchPageContent } from "@/components/estate";

export default async function SearchPage({ params }: { params: Promise<{ term: string }> }) {
    const resolvedParams = await params;
    const queryFromPath = decodeURIComponent(resolvedParams.term);
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchPageContent queryFromPath={queryFromPath} />
        </Suspense>
    )
}
