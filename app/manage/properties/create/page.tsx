
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { CreatePropertySchema, type CreatePropertyFormValues, type User } from '@/types';
import { createPropertyAction, getCurrentAccountId, getPropertyChangeDraftAction, getPropertyCreateDraftAction, savePropertyChangeDraftAction } from '@/app/actions';

import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getUsers } from '@/services/user-service';
import { useAgencyCustomization } from '@/hooks/use-agency-customization';

import { ProgressivePropertySections } from '@/components/manage/progressive-property-sections';

export default function CreatePropertyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [users, setUsers] = React.useState<User[]>([]);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [changeId, setChangeId] = useState<string | null>(searchParams.get('request') || searchParams.get('changes'));

    useEffect(() => {
        getUsers().then(setUsers);
        // Resolve the current user's accountId for agency customization lookup
        getCurrentAccountId().then(id => setAccountId(id));
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

    useEffect(() => {
        const draftId = searchParams.get('request') || searchParams.get('changes');
        if (!draftId) return;

        let cancelled = false;

        async function loadDraftAndProperty() {
            const draftResult = await getPropertyChangeDraftAction(draftId);
            if (cancelled) return;

            const shouldLoadTable = !draftResult.success || !draftResult.data || Object.keys(draftResult.data).length === 0;
            const tableResult = shouldLoadTable ? await getPropertyCreateDraftAction(draftId) : null;
            if (cancelled) return;

            const mergedValues = {
                ...form.getValues(),
                ...(tableResult?.success && tableResult.data ? tableResult.data : {}),
                ...(draftResult.success && draftResult.data ? (draftResult.data as Partial<CreatePropertyFormValues>) : {}),
            };

            if (draftResult.success && draftResult.data) {
                form.reset(mergedValues);
                setChangeId(draftId);
                return;
            }

            if (tableResult?.success && tableResult.data) {
                form.reset(mergedValues);
                setChangeId(draftId);
            }
        }

        loadDraftAndProperty();

        return () => {
            cancelled = true;
        };
    }, [searchParams, form]);

    function replaceRequestParam(requestId: string) {
        const params = new URLSearchParams(window.location.search);
        params.set('request', requestId);
        params.set('status', 'creation');
        params.delete('changes');
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }

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

    async function handleSectionAdvance(fromIndex: number, toIndex: number) {
        const result = await savePropertyChangeDraftAction({
            changeId,
            status: 'pending_creation',
            data: form.getValues() as Record<string, any>,
        });

        if (result.success && result.changeId) {
            setChangeId(result.changeId);
            replaceRequestParam(result.changeId);
        } else {
            toast({
                variant: 'destructive',
                title: 'Could not save request',
                description: result.error || 'Please try again before continuing.',
            });
        }
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
                        onSectionAdvance={handleSectionAdvance}
                    />
                </form>
            </Form>
        </div>
    );
}
