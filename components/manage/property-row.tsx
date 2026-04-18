
"use client";

import type { Property } from '@/types';
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, ExternalLink } from "lucide-react";
import { ClientLink } from '@/components/client-link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';


interface AdminPropertyRowProps {
    property: Property;
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
    
    // The property page can be accessed via slug, or fall back to ID.
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
                <Badge variant={property.isApproved ? 'default' : 'secondary'}>
                    {property.isApproved ? (
                        <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                        <Clock className="mr-2 h-4 w-4" />
                    )}
                    {property.isApproved ? 'Approved' : 'Pending'}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                {property.isApproved && (
                    <ClientLink 
                        href={propertyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                        aria-label={`View ${property.title} on site`}
                    >
                        View
                        <ExternalLink className="h-3 w-3" />
                    </ClientLink>
                )}
            </TableCell>
        </TableRow>
    );
}
