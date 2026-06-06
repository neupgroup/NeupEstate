import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getPropertyById } from "@/services/property-service";
import { Button } from "@/components/ui/button";
import { ClientLink } from "@/components/client-link";
import { AreaDisplayToggle } from "@/components/manage/area-display-toggle";
import { FacingDisplayToggle } from "@/components/manage/facing-display-toggle";
import { RoadAccessDisplayToggle } from "@/components/manage/road-access-display-toggle";
import { Bath, BedDouble, Bike, CalendarDays, CarFront, ChefHat, ChevronLeft, ExternalLink, Layers3, PenSquare, Sofa, SquareUserRound, UtensilsCrossed } from "lucide-react";

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

function formatAmenityIconName(amenity: string) {
    return amenity.toLowerCase().trim().replace(/\s+/g, "-");
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
        <section className="space-y-3">
            <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

function Field({ label, value, icon }: { label: string; value: unknown; icon: ReactNode }) {
    return (
        <div className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:border-primary/35 group-hover:bg-primary/15">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-1 text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                    {typeof value === "string" && value.includes("<") ? (
                        <div dangerouslySetInnerHTML={{ __html: formatHtmlDescription(value) }} />
                    ) : (
                        formatValue(value)
                    )}
                </div>
            </div>
        </div>
    );
}

function ReadonlyGrid({ children }: { children: ReactNode }) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function RoomTile({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: unknown;
}) {
    const normalizedValue = typeof value === "number" ? value : null;

    return (
        <div className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:border-primary/35 group-hover:bg-primary/15">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-sm text-muted-foreground">
                    {normalizedValue == null ? "Not set" : normalizedValue}
                </div>
            </div>
        </div>
    );
}

function AmenityTile({ amenity }: { amenity: string }) {
    const iconName = formatAmenityIconName(amenity);
    const iconUrl = `https://neupgroup.com/estate/assets/ammenity/${iconName}.svg`;

    return (
        <div className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:border-primary/35 group-hover:bg-primary/15">
                <img src={iconUrl} alt={amenity} className="h-5 w-5" loading="lazy" />
            </div>
            <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{amenity}</div>
            </div>
        </div>
    );
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
        <div className="space-y-10 max-w-6xl mx-auto">
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
                    <AreaDisplayToggle value={property.area} />
                    <FacingDisplayToggle value={property.facing} />
                    <Field label="Build Start Year" value={property.buildStart} icon={<CalendarDays className="h-5 w-5" />} />
                    <Field label="Build End Year" value={property.buildCompleted} icon={<CalendarDays className="h-5 w-5" />} />
                    <Field label="Floors" value={property.floors} icon={<Layers3 className="h-5 w-5" />} />
                    <Field label="On Floor" value={property.onFloor} icon={<SquareUserRound className="h-5 w-5" />} />
                    <RoadAccessDisplayToggle value={property.roadAccess} />
                </ReadonlyGrid>
            </Section>

            <Section title="Rooms and Spaces" description="Room counts and parking capacity.">
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<BedDouble className="h-5 w-5" />} label="Bedrooms" value={property.bedrooms} />
                    </div>
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<Bath className="h-5 w-5" />} label="Bathrooms" value={property.bathrooms} />
                    </div>
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<ChefHat className="h-5 w-5" />} label="Kitchens" value={property.kitchens} />
                    </div>
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<UtensilsCrossed className="h-5 w-5" />} label="Dining Rooms" value={property.diningRooms} />
                    </div>
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<Sofa className="h-5 w-5" />} label="Living Rooms" value={property.livingRooms} />
                    </div>
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<CarFront className="h-5 w-5" />} label="Car Parking Spots" value={property.carParkingSpots} />
                    </div>
                    <div className="min-w-[40%] flex-none snap-start md:min-w-0">
                        <RoomTile icon={<Bike className="h-5 w-5" />} label="Bike Parking Spots" value={property.bikeParkingSpots} />
                    </div>
                </div>
            </Section>

            <Section title="Features & Amenities" description="Shared features and highlights.">
                {property.amenities?.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {property.amenities.map((amenity) => (
                            <AmenityTile key={amenity} amenity={amenity} />
                        ))}
                    </div>
                ) : (
                    <Field label="Amenities" value="None" icon={<Layers3 className="h-5 w-5" />} />
                )}
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
