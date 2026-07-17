/*
::neup.documentation::public-property-gallery-page

Renders the public property gallery grid and optionally the full-page selected-image view.

::end
*/

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPropertyById, getPropertyBySlug } from "@/services/property-service";
import { logProblem } from "@/services/problem-service";
import { PropertyGalleryFullPage } from "@/components/manage/property-gallery-full-page";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type PropertyGalleryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    image?: string | string[];
    mode?: string | string[];
  }>;
};

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseImageOrder(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(getSingleSearchParam(value) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function isFullPageMode(value: string | string[] | undefined): boolean {
  return getSingleSearchParam(value) === "fullpage";
}

export default async function PropertyGalleryPage({
  params,
  searchParams,
}: PropertyGalleryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  let property;

  try {
    property = await getPropertyBySlug(slug);

    if (!property) {
      property = await getPropertyById(slug);
    }
  } catch (error) {
    await logProblem(error, `Error fetching property gallery for slug/ID: ${slug}`);
    notFound();
  }

  if (!property || !property.isApproved) {
    notFound();
  }

  const propertySlug = property.slug || property.id;
  const requestedImage = parseImageOrder(query.image);
  const fullPageMode = isFullPageMode(query.mode);

  if (property.slug && property.slug !== slug) {
    const target = fullPageMode
      ? `/properties/${property.slug}/gallery?mode=fullpage&image=${requestedImage}`
      : `/properties/${property.slug}/gallery`;
    redirect(target);
  }

  const safeImages = Array.isArray(property.images)
    ? property.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : [];

  if (safeImages.length === 0) {
    notFound();
  }

  const initialImage = Math.min(Math.max(requestedImage, 1), safeImages.length);

  if (!fullPageMode) {
    return (
      <main className="container mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {property.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {safeImages.length} photo{safeImages.length === 1 ? "" : "s"}
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href={`/properties/${propertySlug}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to property
            </Link>
          </Button>
        </div>

        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {safeImages.map((src, index) => (
            <Link
              key={`${src}-${index}`}
              href={`/properties/${propertySlug}/gallery?mode=fullpage&image=${index + 1}`}
              className="group mb-4 block break-inside-avoid"
            >
              <div className="relative isolate overflow-hidden overflow-clip rounded-2xl bg-muted [clip-path:inset(0_round_1rem)] [contain:paint]">
                <img
                  src={src}
                  alt={`${property.title} photo ${index + 1}`}
                  className="block h-auto w-full transform-gpu transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  return (
    <PropertyGalleryFullPage
      images={safeImages}
      title={property.title}
      propertySlug={propertySlug}
      initialImage={initialImage}
    />
  );
}
