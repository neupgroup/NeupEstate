
"use client";

import type { Property } from '@/types';
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, ExternalLink, XCircle, Home, Archive } from "lucide-react";
import { ClientLink } from '@/components/client-link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';


interface AdminPropertyRowProps {
    property: Property;
}

function StatusBadge({ property }: { property: Property }) {
    const status = property.status;

    if (status === 'ACTIVE') {
        return (
            <Badge variant="default">
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                Active
            </Badge>
        );
    }
    if (status === 'PENDING') {
        return (
            <Badge variant="secondary">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Pending
            </Badge>
        );
    }
    if (status === 'SOLD') {
        return (
            <Badge variant="outline" className="border-green-500 text-green-700">
                <Home className="mr-1.5 h-3.5 w-3.5" />
                Sold
            </Badge>
        );
    }
    if (status === 'RENTED') {
        return (
            <Badge variant="outline" className="border-blue-500 text-blue-700">
                <Home className="mr-1.5 h-3.5 w-3.5" />
                Rented
            </Badge>
        );
    }
    if (status === 'ARCHIVED') {
        return (
            <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archived
            </Badge>
        );
    }
    // Fallback for legacy data without status
    return (
        <Badge variant={property.isApproved ? 'default' : 'secondary'}>
            {property.isApproved
                ? <><CheckCircle className="mr-1.5 h-3.5 w-3.5" />Active</>
                : <><Clock className="mr-1.5 h-3.5 w-3.5" />Pending</>
            }
        </Badge>
    );
}

export function AdminPropertyRow({ property }: AdminPropertyRowProps) {
    const formatPrice = (price: number, purpose: string) => {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(price);
        return purpose === 'Rent' ? `${formatted}/month` : formatted;
    };

    const propertyUrl = `/properties/${property.slug || property.id}`;

    return (
        <TableRow>
            <TableCell className="font-medium">
                <ClientLink href={`/manage/properties/${property.id}/edit`} className="hover:underline">
                    {property.title}
                </ClientLink>
            </TableCell>
            <TableCell>{property.location}</TableCell>
            <TableCell>{formatPrice(property.price, property.purpose)}</TableCell>
            <TableCell>
                <StatusBadge property={property} />
            </TableCell>
            <TableCell className="text-right">
                {property.isApproved && (
                    <a
                        href={propertyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                        aria-label={`View ${property.title} on site`}
                    >
                        View
                        <ExternalLink className="h-3 w-3" />
                    </a>
                )}
            </TableCell>
        </TableRow>
    );
}
