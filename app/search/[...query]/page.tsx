
import { Suspense } from "react";
import { SearchPageContent } from "@/components/estate";

export default async function SearchPage({ params }: { params: Promise<{ query?: string[] }> }) {
    const resolvedParams = await params;
    const queryFromPath = resolvedParams.query ? decodeURIComponent(resolvedParams.query.join('/')) : "";
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchPageContent queryFromPath={queryFromPath} />
        </Suspense>
    )
}
