"use client";

import type { Property } from '@/types';
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle, Clock, Home, Archive } from "lucide-react";
import { ClientLink } from '@/components/client-link';
import { cn } from '@/lib/utils';

interface AdminPropertyRowProps {
    property: Property;
}

function StatusBadge({ property }: { property: Property }) {
    const status = property.status;

    if (status === 'ACTIVE') {
        return (
            <Badge variant="default" className="shrink-0">
                <CheckCircle className="mr-1 h-3 w-3" />
                Active
            </Badge>
        );
    }
    if (status === 'PENDING') {
        return (
            <Badge variant="secondary" className="shrink-0">
                <Clock className="mr-1 h-3 w-3" />
                Pending
            </Badge>
        );
    }
    if (status === 'SOLD') {
        return (
            <Badge variant="outline" className="shrink-0 border-green-500 text-green-700">
                <Home className="mr-1 h-3 w-3" />
                Sold
            </Badge>
        );
    }
    if (status === 'RENTED') {
        return (
            <Badge variant="outline" className="shrink-0 border-blue-500 text-blue-700">
                <Home className="mr-1 h-3 w-3" />
                Rented
            </Badge>
        );
    }
    if (status === 'ARCHIVED') {
        return (
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
                <Archive className="mr-1 h-3 w-3" />
                Archived
            </Badge>
        );
    }
    // Fallback
    return (
        <Badge variant={property.isApproved ? 'default' : 'secondary'} className="shrink-0">
            {property.isApproved ? 'Active' : 'Pending'}
        </Badge>
    );
}

function formatPrice(price: number, purpose: string) {
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(price);
    return purpose === 'Rent' ? `${formatted}/mo` : formatted;
}

export function AdminPropertyRow({ property }: AdminPropertyRowProps) {
    return (
        <ClientLink
            href={`/manage/properties/${property.id}/edit`}
            className={cn(
                "flex items-center justify-between gap-4 px-5 py-4",
                "hover:bg-muted/50 transition-colors group"
            )}
        >
            {/* Left — title + meta */}
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">
                    {property.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                    {[
                        property.location,
                        property.category,
                        formatPrice(property.price, property.purpose),
                    ].filter(Boolean).join(' · ')}
                </p>
            </div>

            {/* Right — status + arrow */}
            <div className="flex items-center gap-3 shrink-0">
                <StatusBadge property={property} />
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </ClientLink>
    );
}
