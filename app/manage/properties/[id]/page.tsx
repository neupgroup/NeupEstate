import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getPropertyById } from "@/services/property-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientLink } from "@/components/client-link";
import { ChevronLeft, ExternalLink, PenSquare } from "lucide-react";

type PageProps = {
    params: Promise<{ id: string }>;
};

function formatValue(value: unknown): string {
    if (value == null || value === "") return "Not set";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
        if (!value.length) return "None";
        return value.map((entry) => formatValue(entry)).join(", ");
    }
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
}

function formatHtmlDescription(value: string | undefined) {
    if (!value) return "Not set";
    return value;
}

function formatPurposeSummary(purposes: string[] | null | undefined) {
    const uniquePurposes = Array.from(
        new Set(
            (purposes ?? [])
                .map((entry) => entry?.trim())
                .filter((entry): entry is string => Boolean(entry)),
        ),
    );

    if (!uniquePurposes.length) return "No purpose";
    if (uniquePurposes.length === 1) return `For ${uniquePurposes[0]}`;
    if (uniquePurposes.length === 2) {
        return `For ${uniquePurposes[0]} and ${uniquePurposes[1]}`;
    }

    return `For ${uniquePurposes.join(", ")}`;
}

function formatLocation(property: {
    location?: string | null;
    structuredLocation?: {
        municipality?: string | null;
        ward?: number | null;
        district?: string | null;
        province?: string | null;
    } | null;
}) {
    const parts = [
        property.structuredLocation?.municipality?.trim(),
        property.structuredLocation?.ward != null ? `Ward ${property.structuredLocation.ward}` : null,
        property.structuredLocation?.district?.trim(),
        property.structuredLocation?.province?.trim(),
        property.location?.trim(),
    ].filter((part): part is string => Boolean(part));

    if (!parts.length) return "Location not set";
    return parts.join(", ");
}

function formatPropertyTypes(category?: string | null) {
    return category?.trim() || "Property type not set";
}

function formatNature(type?: string | null) {
    return type?.trim() || "Property nature not set";
}

function formatHeaderSubtitle(property: {
    type?: string | null;
    category?: string | null;
    purposes?: string[] | null;
    location?: string | null;
    structuredLocation?: {
        municipality?: string | null;
        ward?: number | null;
        district?: string | null;
        province?: string | null;
    } | null;
}) {
    const nature = formatNature(property.type);
    const propertyTypes = formatPropertyTypes(property.category);
    const purposeSummary = formatPurposeSummary(property.purposes);
    const location = formatLocation(property);
    return `${nature} ${propertyTypes} ${purposeSummary} at ${location}`.replace(/\s+/g, " ").trim();
}

function getPropertyNotice(property: {
    isApproved?: boolean | null;
    status?: string | null;
    isOwnerListing?: boolean | null;
    details?: { isPrivate?: boolean | null } | null;
}) {
    if (property.details?.isPrivate) {
        return 'This is a private property. It will not show up on the website for anyone outside your team.';
    }

    const normalizedStatus = property.status?.toLowerCase?.();
    if (property.isApproved === false || normalizedStatus === 'pending' || normalizedStatus === 'awaitingreview' || normalizedStatus === 'awaiting review') {
        return 'This property has not been reviewed. It will be visible on website after the final review.';
    }

    return null;
}

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <Card className="border-border/60">
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">{children}</CardContent>
        </Card>
    );
}

function Field({ label, value }: { label: string; value: unknown }) {
    return (
        <div className="rounded-xl border bg-background px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                {typeof value === "string" && value.includes("<") ? (
                    <div dangerouslySetInnerHTML={{ __html: formatHtmlDescription(value) }} />
                ) : (
                    formatValue(value)
                )}
            </div>
        </div>
    );
}

function ReadonlyGrid({ children }: { children: ReactNode }) {
    return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export default async function ViewPropertyPage({ params }: PageProps) {
    const { id } = await params;
    const property = await getPropertyById(id, { includeInactive: true });
    if (!property) notFound();

    const editUrl = `/manage/properties/${property.id}/edit`;
    const siteUrl = property.slug ? `/properties/${property.slug}` : null;
    const headerSubtitle = formatHeaderSubtitle({
        type: property.type,
        category: property.category,
        purposes: property.purposes,
        location: property.location,
        structuredLocation: property.structuredLocation,
    });
    const propertyNotice = getPropertyNotice({
        isApproved: property.isApproved,
        status: property.status,
        isOwnerListing: property.isOwnerListing,
        details: property.details,
    });

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <ClientLink
                href="/manage/properties"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ChevronLeft className="h-4 w-4" />
                Back to Properties
            </ClientLink>

            <div className="space-y-1">
                <div className="flex items-start gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">{property.title}</h1>
                    {siteUrl && (
                        <ClientLink
                            href={siteUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open public property page"
                            className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </ClientLink>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
                {propertyNotice && (
                    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm font-medium text-muted-foreground">
                        {propertyNotice}
                    </div>
                )}
            </div>

            <Section title="Property Specifics" description="Core measurements and structural details.">
                <ReadonlyGrid>
                    <Field label="Area" value={property.area} />
                    <Field label="Area Unit" value={property.areaUnit} />
                    <Field label="Facing" value={property.facing} />
                    <Field label="Build Start Year" value={property.buildStart} />
                    <Field label="Build End Year" value={property.buildCompleted} />
                    <Field label="Floors" value={property.floors} />
                    <Field label="On Floor" value={property.onFloor} />
                    <Field label="Road Access" value={property.roadAccess ? `${property.roadAccess} ft` : undefined} />
                </ReadonlyGrid>
            </Section>

            <Section title="Rooms & Space" description="Room counts and parking capacity.">
                <ReadonlyGrid>
                    <Field label="Bedrooms" value={property.bedrooms} />
                    <Field label="Bathrooms" value={property.bathrooms} />
                    <Field label="Kitchens" value={property.kitchens} />
                    <Field label="Dining Rooms" value={property.diningRooms} />
                    <Field label="Living Rooms" value={property.livingRooms} />
                    <Field label="Car Parking Spots" value={property.carParkingSpots} />
                    <Field label="Bike Parking Spots" value={property.bikeParkingSpots} />
                </ReadonlyGrid>
            </Section>

            <Section title="Features & Amenities" description="Shared features and highlights.">
                <ReadonlyGrid>
                    <Field label="Amenities" value={property.amenities} />
                </ReadonlyGrid>
            </Section>

            <Section title="Pricing Details" description="Price and pricing metadata.">
                <ReadonlyGrid>
                    <Field label="Price" value={property.price} />
                    <Field label="Pricing" value={property.pricing} />
                </ReadonlyGrid>
            </Section>

            <Section title="Location Details" description="Structured location and coordinates.">
                <ReadonlyGrid>
                    <Field label="Structured Location" value={property.structuredLocation} />
                    <Field label="Latitude" value={property.latitude} />
                    <Field label="Longitude" value={property.longitude} />
                </ReadonlyGrid>
            </Section>

            <Section title="Owner Information" description="Ownership and agent context.">
                <ReadonlyGrid>
                    <Field label="Owners" value={property.owners} />
                    <Field label="Agency" value={property.agency?.name} />
                    <Field label="Listing Agent" value={property.listingAgent} />
                    <Field label="Owner Listing" value={property.isOwnerListing} />
                </ReadonlyGrid>
            </Section>

            <Section title="Photos" description="Photos and attached files.">
                <ReadonlyGrid>
                    <Field label="Images" value={property.images} />
                    <Field label="Documents" value={property.documents} />
                </ReadonlyGrid>
            </Section>

            <Section title="Source & Metadata" description="External source and record timestamps.">
                <ReadonlyGrid>
                    <Field label="Source URL" value={property.sourceUrl} />
                    <Field label="Created At" value={property.createdAt} />
                    <Field label="Updated At" value={property.updatedAt} />
                    <Field label="Slug" value={property.slug} />
                </ReadonlyGrid>
            </Section>

            <div className="flex justify-start">
                <Button asChild>
                    <ClientLink href={editUrl}>
                        <PenSquare className="mr-2 h-4 w-4" />
                        Edit Property
                    </ClientLink>
                </Button>
            </div>
        </div>
    );
}
