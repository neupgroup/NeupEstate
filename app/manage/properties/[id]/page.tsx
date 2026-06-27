import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getPropertyById, getPropertyReviewRequests } from "@/services/property-service";
import { hasPermission } from "@/logica/auth/authorization";
import { PERMISSIONS } from "@/logica/auth/permissions";
import { cancelPropertyChangeDraftAction, getCurrentAccountId, getPropertyChangeContextAction, requestPropertyDeletionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { PropertyReviewRequests } from "@/components/manage/property-review-requests";
import { ClientLink } from "@/components/client-link";
import { AreaDisplayToggle } from "@/components/manage/area-display-toggle";
import { FacingDisplayToggle } from "@/components/manage/facing-display-toggle";
import { RoadAccessDisplayToggle } from "@/components/manage/road-access-display-toggle";
import { PropertyMediaGallery } from "@/components/manage/property-media-gallery";
import { Bath, BedDouble, Bike, Building2, CalendarDays, CarFront, ChefHat, ChevronLeft, ExternalLink, FileText, Layers3, Link2, PenSquare, Sofa, SquareUserRound, Tag, UserRound, UtensilsCrossed } from "lucide-react";

type PageProps = {
    params: Promise<{ id: string }>;
    searchParams?: Promise<Record<string, string | undefined>>;
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

function hasLocationValue(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return true;
    if (Array.isArray(value)) return value.some(hasLocationValue);
    if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasLocationValue);
    return false;
}

function formatLocationSummary(property: {
    structuredLocation?: {
        country?: string | null;
        province?: string | null;
        district?: string | null;
        municipality?: string | null;
        ward?: number | null;
        street?: string | null;
        landmark?: string | null;
    } | null;
    location?: string | null;
}) {
    const parts = [
        property.structuredLocation?.country?.trim(),
        property.structuredLocation?.province?.trim(),
        property.structuredLocation?.district?.trim(),
        property.structuredLocation?.municipality?.trim(),
        property.structuredLocation?.ward != null ? `Ward ${property.structuredLocation.ward}` : null,
        property.structuredLocation?.street?.trim(),
        property.structuredLocation?.landmark?.trim(),
        property.location?.trim(),
    ].filter((part): part is string => Boolean(part));

    return parts.join(" > ");
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
    const normalizedStatus = property.status?.toLowerCase?.();
    if (normalizedStatus === 'awaitingdeletion' || normalizedStatus === 'awaiting_deletion') {
        return 'Deletion requested. Once the deletion request is made, it takes 30 days for the property to be deleted.';
    }

    if (property.details?.isPrivate) {
        return 'This is a private property. It will not show up on the website for anyone outside your team.';
    }

    if (property.isApproved === false || normalizedStatus === 'pending' || normalizedStatus === 'awaitingreview' || normalizedStatus === 'awaiting review') {
        return 'This property has not been reviewed. It will be visible on website after the final review.';
    }

    return null;
}

function isPendingReview(property: {
    isApproved?: boolean | null;
    status?: string | null;
}) {
    const normalizedStatus = property.status?.toLowerCase?.();
    return property.isApproved === false || normalizedStatus === "pending" || normalizedStatus === "awaitingreview" || normalizedStatus === "awaiting review";
}

function pendingReviewTone(status?: string | null) {
    const normalized = status?.toLowerCase?.();
    if (normalized === "deleting") return "destructive";
    if (normalized === "changing") return "muted";
    return "info";
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

function OwnerCard({
    owner,
    index,
}: {
    owner: {
        clientName?: string | null;
        clientEmail?: string | null;
        clientPhone?: string | null;
        isPrimaryOwner?: boolean | null;
    };
    index: number;
}) {
    const name = owner.clientName?.trim() || `Owner ${index + 1}`;
    const email = owner.clientEmail?.trim();
    const phone = owner.clientPhone?.trim();

    return (
        <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        {email || phone ? "Contact details" : "No contact details available"}
                    </div>
                </div>
                {owner.isPrimaryOwner && (
                    <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        Primary
                    </span>
                )}
            </div>

            <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</span>
                    <span className="truncate text-right font-medium text-foreground">{email || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</span>
                    <span className="truncate text-right font-medium text-foreground">{phone || "Not set"}</span>
                </div>
            </div>
        </div>
    );
}

function formatPricingValue(value: unknown): string {
    if (value == null || value === "") return "Not set";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
        if (!value.length) return "None";
        return value.map((entry) => formatPricingValue(entry)).join(", ");
    }
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, entry]) => entry != null && entry !== "");
        if (!entries.length) return "None";
        return entries.map(([key, entry]) => `${key}: ${formatPricingValue(entry)}`).join("\n");
    }
    return String(value);
}

function formatPriceAmount(value: number, currency: string = "NPR"): string {
    const symbol = currency === "NPR" ? "NRs." : currency === "USD" ? "$" : currency === "INR" ? "INR" : currency;
    return `${symbol} ${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value)}`;
}

function formatPricingBasisLabel(basis: string): string {
    const labels: Record<string, string> = {
        "house-rent": "House rent",
        "land-sale-unit": "Land sale per unit",
        "land-rent-unit": "Land rent per unit",
        "land-rent-flat": "Land flat rent",
        "apartment-rent": "Apartment rent",
        "house-sale-flat": "House sale",
        "house-rent-monthly": "House rent",
        "house-rent-annual": "House rent",
        "land-sale-per-aana": "Land sale per aana",
        "land-sale-per-ropani": "Land sale per ropani",
        "land-sale-per-sqft": "Land sale per sqft",
        "land-sale-flat": "Land flat sale",
        "land-rent-monthly-per-aana": "Land rent per aana",
        "land-rent-monthly-per-ropani": "Land rent per ropani",
        "land-rent-monthly-per-sqft": "Land rent per sqft",
        "land-rent-monthly-flat": "Land flat rent",
        "land-rent-annual-flat": "Land flat rent",
        "apartment-sale-flat": "Apartment sale",
        "apartment-rent-monthly": "Apartment rent",
        "apartment-rent-annual": "Apartment rent",
        "flat-price": "Flat price",
        "per-month": "Monthly price",
        "per-annum": "Annual price",
        "per-aana": "Price per aana",
        "per-ropani": "Price per ropani",
        "per-sqft": "Price per sqft",
        "per-month-flat": "Monthly flat price",
        "per-annum-flat": "Annual flat price",
    };

    return labels[basis] || basis.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPricingBasisSuffix({
    basis,
    frequency,
    unit,
}: {
    basis: string;
    frequency?: string | null;
    unit?: string | null;
}) {
    const normalizedFrequency = frequency?.trim();
    const normalizedUnit = unit?.trim();
    const hasPerUnitBasis = basis.includes("unit") || basis.includes("per-aana") || basis.includes("per-ropani") || basis.includes("per-sqft");
    const hasFlatBasis = basis.includes("flat") || basis === "flat-price";

    if (normalizedFrequency && normalizedUnit) {
        return `per ${normalizedUnit} per ${normalizedFrequency}`;
    }

    if (normalizedUnit && hasPerUnitBasis) {
        return `per ${normalizedUnit}`;
    }

    if (normalizedFrequency && (!hasFlatBasis || basis.includes("rent"))) {
        return `per ${normalizedFrequency}`;
    }

    return null;
}

function formatHiddenPriceMode(mode?: string | null) {
    if (mode === "price-on-call") return "Price on call";
    if (mode === "offer-yours-first") return "Offer yours first";
    return "Price not available";
}

function getPricingCards(property: {
    price?: number | null;
    pricing?: {
        currency?: string | null;
        priceDisplayMode?: string | null;
        listed?: number | null;
        negotiable?: boolean | null;
        basis?: string | null;
        basisPrices?: Record<string, number | undefined> | null;
        basisNegotiable?: Record<string, boolean | undefined> | null;
        basisNegotiablePrices?: Record<string, number | undefined> | null;
        basisFrequencies?: Record<string, string | undefined> | null;
        basisUnits?: Record<string, string | undefined> | null;
    } | null;
}) {
    const pricing = property.pricing;
    const currency = pricing?.currency || "NPR";
    const basisPrices = pricing?.basisPrices ?? {};
    const basisKeys = Array.from(
        new Set([
            ...Object.keys(basisPrices),
            ...(pricing?.basis ? [pricing.basis] : []),
        ]),
    );

    const cards = basisKeys
        .map((basis) => {
            const amount = Number(basisPrices[basis] ?? 0);
            const negotiable = Boolean(pricing?.basisNegotiable?.[basis]);
            const negotiableAmount = Number(pricing?.basisNegotiablePrices?.[basis] ?? 0);

            if (amount <= 0 && negotiableAmount <= 0) return null;

            const suffix = formatPricingBasisSuffix({
                basis,
                frequency: pricing?.basisFrequencies?.[basis] ?? null,
                unit: pricing?.basisUnits?.[basis] ?? null,
            });

            return {
                label: formatPricingBasisLabel(basis),
                value: [formatPriceAmount(amount > 0 ? amount : negotiableAmount, currency), suffix].filter(Boolean).join(" "),
                note: negotiable
                    ? negotiableAmount > 0 && negotiableAmount !== amount
                        ? `Negotiable from ${formatPriceAmount(negotiableAmount, currency)}`
                        : "Negotiable"
                    : null,
            };
        })
        .filter((card): card is { label: string; value: string; note: string | null } => Boolean(card));

    if (cards.length) return cards;

    const listed = Number(pricing?.listed ?? property.price ?? 0);
    if (listed > 0) {
        return [{
            label: pricing?.basis ? formatPricingBasisLabel(pricing.basis) : "Listed price",
            value: formatPriceAmount(listed, currency),
            note: pricing?.negotiable ? "Negotiable" : null,
        }];
    }

    if (pricing?.priceDisplayMode && pricing.priceDisplayMode !== "show-price") {
        return [{
            label: "Public price",
            value: formatHiddenPriceMode(pricing.priceDisplayMode),
            note: null,
        }];
    }

    return [];
}

function PricingCard({
    label,
    value,
    icon,
    note,
}: {
    label: string;
    value: unknown;
    icon: ReactNode;
    note?: string | null;
}) {
    return (
        <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out">
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="mt-1 text-sm font-medium text-foreground whitespace-pre-wrap break-words">
                        {formatPricingValue(value)}
                    </div>
                    {note ? <div className="mt-1 text-xs text-muted-foreground">{note}</div> : null}
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

function DocumentGroupCard({
    name,
    urls,
    index,
}: {
    name: string;
    urls: Array<{ value: string }>;
    index: number;
}) {
    return (
        <div className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">
                        {name || `Document Group ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {urls.length} link{urls.length === 1 ? "" : "s"}
                    </p>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="mt-4 space-y-2">
                {urls.length > 0 ? (
                    urls.map((url, urlIndex) => (
                        <a
                            key={`${url.value}-${urlIndex}`}
                            href={url.value}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{url.value}</span>
                        </a>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No document links.</p>
                )}
            </div>
        </div>
    );
}

function normalizeMode(mode?: string) {
    return mode?.toLowerCase?.() ?? "";
}

export default async function ViewPropertyPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const sp = await searchParams ?? {};
    const mode = normalizeMode(sp.mode);
    const property = await getPropertyById(id, { includeInactive: true });
    if (!property) notFound();

    const editUrl = `/manage/properties/${property.id}/edit`;
    const siteUrl = property.slug ? `/properties/${property.slug}` : null;
    const hasLocation = hasLocationValue(property.structuredLocation) || hasLocationValue(property.location) || hasLocationValue(property.latitude) || hasLocationValue(property.longitude);
    const locationSummary = formatLocationSummary({
        structuredLocation: property.structuredLocation,
        location: property.location,
    });
    const canApproveProperty = await hasPermission(PERMISSIONS.manage.propertyReviewApprove);
    const currentAccountId = await getCurrentAccountId();
    const changeContext = await getPropertyChangeContextAction(property.id);
    const currentChange = changeContext.success ? changeContext.currentUserChange : null;
    const isMyChange = Boolean(currentAccountId && currentChange?.accountId === currentAccountId);
    const awaitingReview = isPendingReview({
        isApproved: property.isApproved,
        status: property.status,
    });
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
    const reviewTone = pendingReviewTone(currentChange?.status ?? property.status);
    const reviewMessage = currentChange?.status === "deleting"
        ? `The deletion request on ${canApproveProperty ? "this" : isMyChange ? "your" : "this"} property has not been approved. It will be deleted after review.`
        : currentChange?.status === "changing"
            ? `The change on ${canApproveProperty ? "this" : isMyChange ? "your" : "this"} property has not been published. It will be visible after review.`
            : `The ${canApproveProperty ? "this" : isMyChange ? "your" : "this"} property has not been published. It will be visible after review.`;
    const showCancelDraftAction = currentChange?.status === "deleting" && !canApproveProperty;
    const reviewRequests = mode === "review" && canApproveProperty
        ? await getPropertyReviewRequests(property.id)
        : [];
    const canViewPropertyLogs = await hasPermission(PERMISSIONS.root.propertyLog);
    const pricingCards = getPricingCards(property);

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            <ClientLink
                href="/manage/properties"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ChevronLeft className="h-4 w-4" />
                Back to Properties
            </ClientLink>

            <div className="space-y-0">
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
                {propertyNotice && !awaitingReview && (
                    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm font-medium text-muted-foreground">
                        {propertyNotice}
                    </div>
                )}
                {awaitingReview && (
                    <div
                        className={[
                            "rounded-lg border px-4 py-3 text-sm",
                            reviewTone === "destructive"
                                ? "border-red-200 bg-red-50 text-red-950"
                                : reviewTone === "muted"
                                    ? "border-slate-200 bg-slate-50 text-slate-950"
                                    : "border-blue-200 bg-blue-50 text-blue-950",
                        ].join(" ")}
                    >
                        <div className="flex flex-wrap items-center gap-1">
                            <span>{reviewMessage}</span>
                            {canApproveProperty ? (
                                <ClientLink href={`/manage/properties/${property.id}?mode=review`} className="inline-flex items-center rounded-full border border-current/20 px-2.5 py-1 text-xs font-medium underline underline-offset-2">
                                    Open approval view
                                </ClientLink>
                            ) : showCancelDraftAction ? (
                                <form
                                    action={async () => {
                                        await cancelPropertyChangeDraftAction(currentChange?.id ?? "");
                                    }}
                                >
                                    <Button
                                        type="submit"
                                        variant="link"
                                        className="h-auto p-0 align-baseline underline font-medium text-inherit"
                                    >
                                        Don&apos;t want to delete, cancel it!
                                    </Button>
                                </form>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-0">
                <PropertyMediaGallery images={property.images ?? []} title={property.title} />
            </div>

            {mode === "review" && canApproveProperty && (
                <section className="space-y-3">
                    <div className="space-y-0.5">
                        <h2 className="text-lg font-semibold tracking-tight">Review Requests</h2>
                        <p className="text-sm text-muted-foreground">Approve or reject pending changes for this property.</p>
                    </div>
                    {reviewRequests.length ? (
                        <div className="space-y-4">
                            <PropertyReviewRequests propertyId={property.id} requests={reviewRequests} canApprove={canApproveProperty} />
                        </div>
                    ) : (
                        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            No pending requests for this property.
                        </div>
                    )}
                </section>
            )}

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
                {pricingCards.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pricingCards.map((card) => (
                            <PricingCard
                                key={`${card.label}-${card.value}`}
                                label={card.label}
                                value={card.value}
                                note={card.note}
                                icon={<Tag className="h-5 w-5" />}
                            />
                        ))}
                    </div>
                ) : (
                    <Field label="Pricing" value="Not set" icon={<Tag className="h-5 w-5" />} />
                )}
            </Section>

            {hasLocation && (
                <Section title="Location Details" description="Structured location and coordinates.">
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {locationSummary ? <p className="font-medium text-foreground">{locationSummary}</p> : null}
                        <p>
                            {[
                                property.structuredLocation?.country,
                                property.structuredLocation?.province,
                                property.structuredLocation?.district,
                                property.structuredLocation?.municipality,
                                property.structuredLocation?.ward != null ? `Ward ${property.structuredLocation.ward}` : null,
                                property.structuredLocation?.street,
                                property.structuredLocation?.landmark,
                                property.location,
                            ].filter((part): part is string => Boolean(part)).join(" > ")}
                        </p>
                        {(property.latitude != null && property.longitude != null) && (
                            <p>Geo: {property.latitude}, {property.longitude}</p>
                        )}
                    </div>
                </Section>
            )}

            <Section title="Owner Information" description="Ownership and agent context.">
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {property.owners?.length ? (
                            property.owners.map((owner, index) => (
                                <OwnerCard key={`${owner.ownerClientId || owner.clientName || index}-${index}`} owner={owner} index={index} />
                            ))
                        ) : (
                            <div className="rounded-xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                                No owners recorded.
                            </div>
                        )}
                    </div>
                </div>
            </Section>

            <Section title="Documents" description="Attached files and reference links.">
                {property.documents?.length ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {property.documents.map((document, index) => (
                            <DocumentGroupCard
                                key={`${document.name}-${index}`}
                                name={document.name}
                                urls={document.urls ?? []}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        No documents attached.
                    </div>
                )}
            </Section>

            <div className="flex justify-start">
                <div className="flex flex-wrap gap-3">
                    <Button asChild>
                        <ClientLink href={editUrl}>
                            <PenSquare className="mr-2 h-4 w-4" />
                            Edit Property
                        </ClientLink>
                    </Button>
                    {canViewPropertyLogs ? (
                        <Button asChild variant="outline">
                            <ClientLink href={`/manage/properties/${property.id}/logs`}>
                                View Logs
                            </ClientLink>
                        </Button>
                    ) : null}
                    {property.status !== "AWAITING_DELETION" ? (
                        <form
                            action={async () => {
                                "use server";
                                await requestPropertyDeletionAction(property.id);
                            }}
                        >
                            <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
                                Request Deletion
                            </Button>
                        </form>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
