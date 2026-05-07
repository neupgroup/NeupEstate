
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { CreatePropertySchema, type CreatePropertyFormValues, type User } from '@/types';
import { createPropertyAction } from '@/app/actions';

import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/services/user-service';
import { getIdentity } from '@/services/neupid/get-identity';
import { useAgencyCustomization } from '@/hooks/use-agency-customization';

import { ProgressivePropertySections } from '@/components/manage/progressive-property-sections';

export default function CreatePropertyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [users, setUsers] = React.useState<User[]>([]);
    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        getUsers().then(setUsers);
        // Resolve the current user's accountId for agency customization lookup
        getIdentity().then(result => {
            if (result.authenticated) setAccountId(result.user.accountId);
        });
    }, []);

    const { rule: agencyRule } = useAgencyCustomization(accountId, 'property');

    const form = useForm<CreatePropertyFormValues>({
        resolver: zodResolver(CreatePropertySchema),
        defaultValues: {
            title: '',
            description: '',
            purposes: [],
            area: undefined,
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

    const primaryPurpose = form.watch('purposes')?.[0];

    useEffect(() => {
        if (primaryPurpose === 'Sale') {
            form.setValue('pricing.basis', 'one-time-total(house/apartment)');
        }
    }, [primaryPurpose, form]);

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
                    <ProgressivePropertySections
                        form={form}
                        users={users}
                        isEditForm={false}
                        isSubmitting={isPending}
                        submitLabel={isPending ? 'Creating...' : 'Create Property'}
                        agencyRule={agencyRule}
                    />
                </form>
            </Form>
        </div>
    );
}
