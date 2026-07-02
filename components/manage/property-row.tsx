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
    const s = property.status;
    if (s === 'ACTIVE')   return <Badge variant="default"   className="shrink-0 text-[11px]"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>;
    if (s === 'AWAITING_DELETION') return <Badge variant="secondary" className="shrink-0 text-[11px]"><Clock className="mr-1 h-3 w-3" />Awaiting Deletion</Badge>;
    if (s === 'PENDING')  return <Badge variant="secondary" className="shrink-0 text-[11px]"><Clock       className="mr-1 h-3 w-3" />Pending</Badge>;
    if (s === 'SOLD')     return <Badge variant="outline"   className="shrink-0 text-[11px] border-green-500 text-green-700"><Home className="mr-1 h-3 w-3" />Sold</Badge>;
    if (s === 'RENTED')   return <Badge variant="outline"   className="shrink-0 text-[11px] border-blue-500 text-blue-700"><Home className="mr-1 h-3 w-3" />Rented</Badge>;
    if (s === 'ARCHIVED') return <Badge variant="outline"   className="shrink-0 text-[11px] text-muted-foreground"><Archive className="mr-1 h-3 w-3" />Archived</Badge>;
    return <Badge variant={property.isApproved ? 'default' : 'secondary'} className="shrink-0 text-[11px]">{property.isApproved ? 'Active' : 'Pending'}</Badge>;
}

function getPropertyByline(property: Property): string | null {
    if (property.listingAgent) return `by ${property.listingAgent}`;
    return null;
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
        <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
            {cover ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={cover}
                        alt={property.title}
                        className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/25" />
                </>
            ) : (
                <Icon className="h-6 w-6 text-muted-foreground" />
            )}
        </div>
    );
}

function formatCurrencyPrefix(currency?: string) {
    if (currency === 'NPR') return 'NRs.';
    if (currency === 'INR') return 'IRs.';
    return '$';
}

function formatBasisLabel(basis?: string) {
    switch (basis) {
        case 'house-rent-monthly':
        case 'apartment-rent-monthly':
        case 'per-month':
        case 'per-month-flat':
            return 'per Month';
        case 'house-rent-annual':
        case 'apartment-rent-annual':
        case 'per-annum':
        case 'per-annum-flat':
            return 'per Year';
        case 'per-aana':
        case 'land-sale-per-aana':
            return 'per Aana';
        case 'per-ropani':
        case 'land-sale-per-ropani':
            return 'per Ropani';
        case 'per-sqft':
        case 'land-sale-per-sqft':
            return 'per Sq Ft';
        default:
            return null;
    }
}

function getPropertyPriceLine(property: Property) {
    const hiddenPriceLabel = getHiddenPriceLabel(property);
    if (hiddenPriceLabel) return null;

    const currency = formatCurrencyPrefix(property.pricing?.currency);
    const amount = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
    }).format(property.price || 0);
    const basis = formatBasisLabel(property.pricing?.basis);

    return `for ${currency} ${amount}${basis ? ` ${basis}` : ''}`;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export function AdminPropertyRow({ property, draftKind }: { property: Property; draftKind?: 'creation_draft' | 'creation_pending' | 'changing' | 'deleting' }) {
    const byline = getPropertyByline(property);
    const priceLine = getPropertyPriceLine(property);

    return (
        <ClientLink
            href={`/manage/properties/${property.id}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group"
        >
            <Thumbnail property={property} />

            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                    {property.title}
                </p>
                {priceLine ? (
                    <p className="text-xs text-muted-foreground truncate">
                        {priceLine}
                    </p>
                ) : null}
                {byline ? (
                    <p className="text-xs text-muted-foreground truncate">
                        {byline}
                    </p>
                ) : null}
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
        propertyId?: string | null;
        title: string;
        location?: string;
        category?: string;
        status: 'creation_draft' | 'creation_pending' | 'changing' | 'deleting';
        modifiedOn: string;
    };
}) {
    const lastUpdated = new Date(draft.modifiedOn).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
    const href = draft.status === 'creation_draft'
        ? `/manage/properties/create?changeId=${draft.id}`
        : draft.propertyId
            ? `/manage/properties/${draft.propertyId}/edit`
            : `/manage/properties/create`;
    const badgeLabel = draft.status === 'creation_draft'
        ? 'Incomplete'
        : draft.status === 'creation_pending'
            ? 'Pending Creation'
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

export function DraftIndicator({ kind, isActive }: { kind: 'creation_draft' | 'creation_pending' | 'changing' | 'deleting'; isActive?: boolean }) {
    const label = kind === 'creation_draft'
        ? 'Drafts'
        : kind === 'creation_pending'
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
