
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect } from 'react';
import { CreatePropertySchema, type CreatePropertyFormValues, type User } from '@/types';
import { createPropertyAction } from '@/app/actions';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getUsers } from '@/services/user-service';

import { BasicDetailsSection } from '@/components/manage/property-form-sections/basic-details-section';
import { PropertySpecificsSection } from '@/components/manage/property-form-sections/property-specifics-section';
import { RoomsAndSpaceSection } from '@/components/manage/property-form-sections/rooms-and-space-section';
import { FeaturesAmenitiesSection } from '@/components/manage/property-form-sections/features-amenities-section';
import { PricingDetailsSection } from '@/components/manage/property-form-sections/pricing-details-section';
import { LocationDetailsSection } from '@/components/manage/property-form-sections/location-details-section';
import { OwnerInfoSection } from '@/components/manage/property-form-sections/owner-info-section';
import { PropertyPhotosSection } from '@/components/manage/property-form-sections/property-photos-section';
import { PropertyDocumentsSection } from '@/components/manage/property-form-sections/property-documents-section';
import { SeoSection } from '@/components/manage/property-form-sections/seo-section';

export default function CreatePropertyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [users, setUsers] = React.useState<User[]>([]);

    useEffect(() => {
        getUsers().then(setUsers);
    }, []);

    const form = useForm<CreatePropertyFormValues>({
        resolver: zodResolver(CreatePropertySchema),
        defaultValues: {
            title: '',
            description: '',
            purpose: 'Sale',
            category: 'House',
            type: 'Residential',
            area: 1000,
            bedrooms: 1,
            bathrooms: 1,
            kitchens: 1,
            diningRooms: 0,
            livingRooms: 1,
            carParkingSpots: 0,
            bikeParkingSpots: 0,
            amenities: '',
            images: [''],
            listingAgent: '',
            isOwnerListing: false,
            floors: undefined,
            roadAccess: undefined,
            landDetails: {},
            plots: [],
            apartmentDetails: {},
            apartmentUnits: [],
            structuredLocation: {},
            pricing: {
                listed: 0,
                negotiable: false,
            },
            roadAccessDetails: {},
            distancing: {},
            earnings: {},
            owners: [{
                ownerType: 'unregistered',
                unregisteredOwnerName: '',
                unregisteredOwnerEmail: '',
                unregisteredOwnerPhones: [{ value: ''}],
                unregisteredOwnerNotes: '',
            }],
            documents: [],
        },
    });

    const category = form.watch('category');
    const purpose = form.watch('purpose');

    useEffect(() => {
        if (purpose === 'Sale' || purpose === 'Auction') {
            form.setValue('pricing.basis', 'one-time-total(house/apartment)');
        }
    }, [purpose, form]);

    async function onSubmit(values: CreatePropertyFormValues) {
        startTransition(async () => {
            const result = await createPropertyAction(values);
            if (result.success) {
                toast({
                    title: 'Property Created',
                    description: `The property "${values.title}" has been successfully created.`,
                });
                router.push('/manage/properties');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error creating property',
                    description: result.error,
                });
            }
        });
    }

    return (
        <div className="max-w-6xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    <BasicDetailsSection control={form.control} />
                    
                    <PropertySpecificsSection control={form.control} category={category} />

                    <RoomsAndSpaceSection control={form.control} category={category} />

                    <FeaturesAmenitiesSection control={form.control} />
                    
                    <PricingDetailsSection control={form.control} />

                    <LocationDetailsSection control={form.control} />

                    <OwnerInfoSection control={form.control} users={users} formErrors={form.formState.errors} />

                    <PropertyPhotosSection control={form.control} />

                    <PropertyDocumentsSection control={form.control} />
                    
                    <SeoSection control={form.control} isEditForm={false} />

                    <Button type="submit" disabled={isPending}>
                        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Property'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
