
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

    function getSectionForErrorPath(path: string): string {
        if (path.startsWith("pricing.")) return "pricing";
        if (path.startsWith("structuredLocation")) return "location";
        if (path.startsWith("owners")) return "owners";
        if (path.startsWith("images")) return "photos";
        if (path.startsWith("documents")) return "documents";
        if (path === "title" || path === "description") return "copy";
        if (path.startsWith("amenities")) return "ammenities";
        if (path.startsWith("area") || path.startsWith("landDetails") || path.startsWith("plots") || path.startsWith("apartmentUnits")) return "specifics";
        if (path === "bedrooms" || path === "bathrooms" || path === "kitchens" || path === "diningRooms" || path === "livingRooms" || path === "carParkingSpots" || path === "bikeParkingSpots") return "space";
        if (path === "purposes" || path === "category" || path === "categories" || path === "type" || path === "types") return "basic";
        return "basic";
    }

    function focusFirstErrorSection(errors: Record<string, any>) {
        const preferredOrder = [
            "purposes",
            "category",
            "categories",
            "type",
            "types",
            "area",
            "areaUnit",
            "landDetails",
            "plots",
            "apartmentUnits",
            "bedrooms",
            "bathrooms",
            "kitchens",
            "diningRooms",
            "livingRooms",
            "carParkingSpots",
            "bikeParkingSpots",
            "amenities",
            "pricing",
            "structuredLocation",
            "owners",
            "images",
            "documents",
            "title",
            "description",
        ];

        const flatten = (obj: any, prefix = ""): string[] => {
            if (!obj || typeof obj !== "object") return [];
            const paths: string[] = [];
            for (const key of Object.keys(obj)) {
                const next = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                if (value && typeof value === "object" && !("message" in value)) {
                    paths.push(...flatten(value, next));
                } else if (value) {
                    paths.push(next);
                }
            }
            return paths;
        };

        const errorPaths = flatten(errors);
        const firstPath = preferredOrder.find((field) => errorPaths.some((path) => path === field || path.startsWith(`${field}.`))) || errorPaths[0];
        if (!firstPath) return;
        const section = getSectionForErrorPath(firstPath);
        const params = new URLSearchParams(window.location.search);
        params.set("section", section);
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }

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
                ownerClientId: '',
                isPrimaryOwner: true,
                clientName: '',
                clientEmail: '',
                clientPhone: '',
            }],
            documents: [],
        },
    });

    useEffect(() => {
        const draftId = searchParams.get('request') || searchParams.get('changes');
        if (!draftId) return;
        const resolvedDraftId = draftId;

        let cancelled = false;

        async function loadDraftAndProperty() {
            const draftResult = await getPropertyChangeDraftAction(resolvedDraftId);
            if (cancelled) return;

            const shouldLoadTable = !draftResult.success || !draftResult.data || Object.keys(draftResult.data).length === 0;
            const tableResult = shouldLoadTable ? await getPropertyCreateDraftAction(resolvedDraftId) : null;
            if (cancelled) return;

            const mergedValues = {
                ...form.getValues(),
                ...(tableResult?.success && tableResult.data ? tableResult.data : {}),
                ...(draftResult.success && draftResult.data ? (draftResult.data as Partial<CreatePropertyFormValues>) : {}),
            };

            if (draftResult.success && draftResult.data) {
                form.reset(mergedValues);
                setChangeId(resolvedDraftId);
                return;
            }

            if (tableResult?.success && tableResult.data) {
                form.reset(mergedValues);
                setChangeId(resolvedDraftId);
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

    function onSubmitInvalid(errors: Record<string, any>) {
        focusFirstErrorSection(errors);
        toast({
            variant: 'destructive',
            title: 'Please fix the highlighted errors',
            description: 'Some required fields still need attention before publishing.',
        });
    }

    async function handleSectionAdvance(fromIndex: number, toIndex: number) {
        const result = await savePropertyChangeDraftAction({
            changeId,
            status: 'creating',
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
                <form onSubmit={form.handleSubmit(onSubmit, onSubmitInvalid)} className="space-y-6">
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
