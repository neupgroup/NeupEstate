
import { Suspense } from "react";
import { SearchPageContent } from "@/components/search-page-content";

export default function SearchPage({ params }: { params: { query?: string[] } }) {
    const queryFromPath = params.query ? decodeURIComponent(params.query.join('/')) : "";
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchPageContent queryFromPath={queryFromPath} />
        </Suspense>
    )
}
