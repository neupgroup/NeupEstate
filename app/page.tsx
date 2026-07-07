/*
::neup.documentation::home-page

Composes the public homepage with hero, alternating content sections, and calls to action.

::end
*/
import { Suspense } from "react";
import { SearchSection } from "@/components/estate";
import { Skeleton } from "@/components/ui/skeleton";
import { PopularCategories } from "@/components/home/popular-categories";
import { FeaturedProperties } from "@/components/home/featured-properties";
import { PropertyRequirementsCTA } from "@/components/home/property-requirements-cta";
import { RecentProperties } from "@/components/home/recent-properties";
import { PostPropertyCTA } from "@/components/home/post-property-cta";
import { FeaturedAgencies } from "@/components/home/featured-agencies";
import { CuratedForYouSection } from "@/components/home/curated-for-you";
import { StartWithNeupEstate } from "@/components/home/start-with-neupestate";
import { GuestSigninBanner } from "@/components/layout/guest-signin-banner";
import { getAuthenticatedMeData } from "@/services/auth/me";

const SectionSkeleton = () => (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[192px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
    </div>
);

export default async function Home() {
  const me = await getAuthenticatedMeData();
  const showGuestBanner = me?.accountType === 'guest';

  return (
    <main className="flex-1">
      <SearchSection />
      {showGuestBanner && <GuestSigninBanner variant="hero" />}

      <div className="home-sections">
        <Suspense fallback={<SectionSkeleton />}>
          <PopularCategories />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedProperties />
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <CuratedForYouSection />
        </Suspense>
        
        <PropertyRequirementsCTA />

        <Suspense fallback={<SectionSkeleton />}>
          <RecentProperties />
        </Suspense>
        
        <PostPropertyCTA />
        
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedAgencies />
        </Suspense>

        <StartWithNeupEstate />
      </div>
      
    </main>
  );
}
