/*
::neup.documentation::public-property-gallery-page

Renders the full-page public property gallery for a selected image.

::end
*/

import { notFound, redirect } from "next/navigation";
import { getPropertyById, getPropertyBySlug } from "@/services/property-service";
import { logProblem } from "@/services/problem-service";
import { PropertyGalleryFullPage } from "@/components/manage/property-gallery-full-page";

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

  if (property.slug && property.slug !== slug) {
    redirect(`/properties/${property.slug}/gallery?mode=fullpage&image=${requestedImage}`);
  }

  const safeImages = Array.isArray(property.images)
    ? property.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : [];

  if (safeImages.length === 0) {
    notFound();
  }

  const initialImage = Math.min(Math.max(requestedImage, 1), safeImages.length);

  return (
    <PropertyGalleryFullPage
      images={safeImages}
      title={property.title}
      propertySlug={propertySlug}
      initialImage={initialImage}
    />
  );
}
