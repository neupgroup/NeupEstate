"use client";

import type { Property } from '@/types';
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle, Clock, FileClock, Home, Archive,
    Building2, LandPlot, Store, Layers,
} from "lucide-react";
import { ClientLink } from '@/components/client-link';
import { getHiddenPriceLabel } from '@/logica/core/property-price-display';

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ property }: { property: Property }) {
    if (property.isOwnerListing) return <Badge variant="secondary" className="shrink-0 text-[11px]"><Home className="mr-1 h-3 w-3" />Owner Listing</Badge>;
    const s = property.status;
    if (s === 'ACTIVE')   return <Badge variant="default"   className="shrink-0 text-[11px]"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>;
    if (s === 'PENDING')  return <Badge variant="secondary" className="shrink-0 text-[11px]"><Clock       className="mr-1 h-3 w-3" />Pending</Badge>;
    if (s === 'SOLD')     return <Badge variant="outline"   className="shrink-0 text-[11px] border-green-500 text-green-700"><Home className="mr-1 h-3 w-3" />Sold</Badge>;
    if (s === 'RENTED')   return <Badge variant="outline"   className="shrink-0 text-[11px] border-blue-500 text-blue-700"><Home className="mr-1 h-3 w-3" />Rented</Badge>;
    if (s === 'ARCHIVED') return <Badge variant="outline"   className="shrink-0 text-[11px] text-muted-foreground"><Archive className="mr-1 h-3 w-3" />Archived</Badge>;
    return <Badge variant={property.isApproved ? 'default' : 'secondary'} className="shrink-0 text-[11px]">{property.isApproved ? 'Active' : 'Pending'}</Badge>;
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function Thumbnail({ property }: { property: Property }) {
    const cover = property.images?.[0];

    const Icon =
        property.category === 'Land'                                          ? LandPlot  :
        property.category === 'Apartment' || property.category === 'Flat'    ? Layers     :
        property.category === 'Commercial Space' || property.category === 'Shop Space' ? Store :
        Building2;

    return (
        <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
            {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={cover}
                    alt={property.title}
                    className="h-full w-full object-cover"
                />
            ) : (
                <Icon className="h-6 w-6 text-muted-foreground" />
            )}
        </div>
    );
}

// ─── Price formatter ──────────────────────────────────────────────────────────

function formatPrice(price: number, purpose: string) {
    const f = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(price);
    return purpose === 'Rent' ? `${f}/mo` : f;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export function AdminPropertyRow({ property, draftKind }: { property: Property; draftKind?: 'creating' | 'changing' | 'deleting' }) {
    return (
        <ClientLink
            href={`/manage/properties/${property.id}/edit`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
        >
            <Thumbnail property={property} />

            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                    {property.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                    {[
                        property.location,
                        property.category,
                        property.isOwnerListing ? 'Owner listing' : null,
                        getHiddenPriceLabel(property) || formatPrice(property.price, property.purpose),
                    ].filter(Boolean).join(' · ')}
                </p>
            </div>

            <div className="flex items-center gap-2">
                <StatusBadge property={property} />
                {draftKind && <DraftIndicator kind={draftKind} isActive={property.isApproved} />}
            </div>
        </ClientLink>
    );
}

export function AdminPropertyDraftRow({
    draft,
}: {
    draft: {
        id: string;
        propertyId: string;
        title: string;
        location?: string;
        category?: string;
        status: 'creating' | 'changing' | 'deleting';
        modifiedOn: string;
    };
}) {
    const lastUpdated = new Date(draft.modifiedOn).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
    const href = draft.propertyId
        ? `/manage/properties/${draft.propertyId}/edit`
        : `/manage/properties/create`;
    const badgeLabel = draft.status === 'creating'
        ? 'Incomplete'
        : draft.status === 'deleting'
            ? 'Pending Deletion'
            : 'Pending Changes';

    return (
        <ClientLink
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
        >
            <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-dashed border-border bg-muted flex items-center justify-center">
                <FileClock className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                    {draft.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                    {[draft.location, draft.category, `Draft updated ${lastUpdated}`].filter(Boolean).join(' · ')}
                </p>
            </div>

            <Badge variant="secondary" className="shrink-0 text-[11px]">
                <Clock className="mr-1 h-3 w-3" />
                {badgeLabel}
            </Badge>
        </ClientLink>
    );
}

export function DraftIndicator({ kind, isActive }: { kind: 'creating' | 'changing' | 'deleting'; isActive?: boolean }) {
    const label = kind === 'creating'
        ? 'Drafts'
        : isActive
            ? 'Also in Drafts'
            : 'Drafts';

    return (
        <Badge variant="secondary" className="shrink-0 text-[11px]">
            <Clock className="mr-1 h-3 w-3" />
            {label}
        </Badge>
    );
}
