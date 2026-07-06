
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useMemo, useState } from 'react';
import { CreatePropertySchema, type CreatePropertyFormValues, type User } from '@/types';
import { createPropertyAction, getCurrentAccountId, getCurrentPropertyCreateDraftAction, getCurrentPropertyPostingContextAction, getListingAgentOptionsAction, savePropertyCreateDraftAction } from '@/app/actions';

import { Form } from '@/components/ui/form';
import { useToast } from '@/logica/core/hooks/use-toast';
import { getUsers } from '@/services/user-service';
import { useAgencyCustomization } from '@/logica/core/hooks/use-agency-customization';
import { evaluateAgencyCustomization } from '@/logica/core/evaluate-agency-customization';

import { ProgressivePropertySections } from '@/components/manage/progressive-property-sections';

const DEFAULT_CREATE_PROPERTY_VALUES: CreatePropertyFormValues = {
    title: '',
    description: '',
    purposes: [],
    categories: [],
    types: [],
    area: undefined,
    bedrooms: 1,
    bathrooms: 1,
    areaUnit: 'sqft',
    kitchens: 1,
    diningRooms: 0,
    livingRooms: 1,
    carParkingSpots: 0,
    bikeParkingSpots: 0,
    amenities: '',
    images: [''],
    listingAgent: '',
    isOwnerListing: false,
    isPrivate: false,
    showMap: true,
    showOwnerInformation: true,
    floors: undefined,
    roadAccess: undefined,
    landDetails: {},
    plots: [],
    apartmentDetails: {},
    apartmentUnits: [],
    structuredLocation: {},
    pricing: {
        currency: 'USD',
        priceDisplayMode: 'show-price',
        listed: 0,
        negotiable: false,
    },
    roadAccessDetails: {
        widthUnit: 'ft',
        distanceToMainRoadUnit: 'km',
    },
    distancing: {
        unit: 'km',
    },
    earnings: {
        currency: 'USD',
    },
    owners: [],
    documents: [],
};

/*
::neup.documentation::create-property-page-draft-resume

::private

The create flow keeps an in-progress `property_changes` row keyed by
`changeId`. Draft rows link here with that `changeId` to resume specific
unfinished work. Opening `/manage/properties/create` without a `changeId` starts
a fresh form and keeps draft persistence out of the URL.

::private end
::end
*/
export default function CreatePropertyPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requestedChangeId = searchParams.get('changeId')?.trim() || null;
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [users, setUsers] = React.useState<User[]>([]);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [listingAgentOptions, setListingAgentOptions] = useState<Array<{ id: string; name: string; imageUrl: string | null; agencyId: string | null; agencyName: string | null }>>([]);
    const [postingAgencyId, setPostingAgencyId] = useState<string | null>(null);
    const [effectivePostingProfileId, setEffectivePostingProfileId] = useState<string | null>(null);
    const [postingProfileName, setPostingProfileName] = useState<string | null>(null);
    const [actorDisplayName, setActorDisplayName] = useState<string | null>(null);
    const [actorDisplayImage, setActorDisplayImage] = useState<string | null>(null);
    const [isAgencyProfile, setIsAgencyProfile] = useState(false);
    const [draftChangeId, setDraftChangeId] = useState<string | null>(requestedChangeId);
    const shouldPersistDraftChangeIdInUrl = Boolean(requestedChangeId);
    const activeWorkingProfileId = searchParams.get('workingProfile')?.trim() || null;

    const form = useForm<CreatePropertyFormValues>({
        resolver: zodResolver(CreatePropertySchema),
        defaultValues: DEFAULT_CREATE_PROPERTY_VALUES,
    });
    const watchedValues = form.watch();

    function syncDraftChangeId(nextChangeId: string | null) {
        setDraftChangeId(nextChangeId);
        if (!shouldPersistDraftChangeIdInUrl) {
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        if (nextChangeId) {
            params.set('changeId', nextChangeId);
        } else {
            params.delete('changeId');
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    useEffect(() => {
        async function loadContext() {
            const [userList, currentId, draftResult, postingContextResult] = await Promise.all([
                getUsers(),
                getCurrentAccountId(),
                requestedChangeId
                    ? getCurrentPropertyCreateDraftAction(requestedChangeId)
                    : Promise.resolve({ success: true } as Awaited<ReturnType<typeof getCurrentPropertyCreateDraftAction>>),
                getCurrentPropertyPostingContextAction({ workingProfileId: activeWorkingProfileId }),
            ]);

            setUsers(userList);
            setAccountId(currentId);
            const resolvedDraftData = draftResult.success && draftResult.data
                ? ({
                    ...DEFAULT_CREATE_PROPERTY_VALUES,
                    ...draftResult.data,
                } as CreatePropertyFormValues)
                : null;
            const resolvedPostingAgencyId = postingContextResult.success
                ? (postingContextResult.postingAgencyId ?? null)
                : null;
            const resolvedPostingProfileId = postingContextResult.success
                ? (postingContextResult.effectiveProfileId ?? null)
                : null;

            if (resolvedDraftData) {
                form.reset(resolvedDraftData);
            } else {
                form.reset({
                    ...DEFAULT_CREATE_PROPERTY_VALUES,
                    listingAgentAccountId: currentId ?? '',
                });
            }

            setPostingAgencyId(resolvedPostingAgencyId);
            setEffectivePostingProfileId(resolvedPostingProfileId);
            setPostingProfileName(postingContextResult.success ? postingContextResult.effectiveProfileName ?? postingContextResult.effectiveProfileId ?? null : null);
            setActorDisplayName(postingContextResult.success ? postingContextResult.actorDisplayName ?? null : null);
            setActorDisplayImage(postingContextResult.success ? postingContextResult.actorDisplayImage ?? null : null);
            setIsAgencyProfile(Boolean(postingContextResult.success && postingContextResult.isAgencyProfile));

            if (draftResult.success && draftResult.changeId) {
                setDraftChangeId(draftResult.changeId);
                if (shouldPersistDraftChangeIdInUrl && draftResult.changeId !== requestedChangeId) {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('changeId', draftResult.changeId);
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }
            }
        }

        loadContext();
    }, [activeWorkingProfileId, form, pathname, requestedChangeId, router, searchParams, shouldPersistDraftChangeIdInUrl]);

    useEffect(() => {
        if (!accountId || !postingAgencyId || !isAgencyProfile) {
            setListingAgentOptions([]);
            return;
        }

        async function loadListingAgents() {
            const result = await getListingAgentOptionsAction({
                agencyId: postingAgencyId,
                currentAgentId: accountId,
            });

            if (result.success) {
                setListingAgentOptions(result.agents);
            }
        }

        loadListingAgents();
    }, [accountId, isAgencyProfile, postingAgencyId]);

    const { rule: agencyRule } = useAgencyCustomization(accountId, 'property');
    const currentUser = useMemo(() => users.find((user) => user.id === accountId) ?? null, [accountId, users]);
    const isCreateSubmitDisabled = useMemo(() => {
        const schemaResult = CreatePropertySchema.safeParse(watchedValues);
        if (!schemaResult.success) return true;

        const pricing = watchedValues.pricing;
        const priceDisplayMode = pricing?.priceDisplayMode || 'show-price';
        if (priceDisplayMode === 'show-price') {
            const selectedBasis = pricing?.basis;
            const selectedBasisPrice = selectedBasis ? Number(pricing?.basisPrices?.[selectedBasis] ?? 0) : 0;
            const hasAnyFilledBasisPrice = Object.values(pricing?.basisPrices ?? {}).some((value) => Number(value ?? 0) > 0);
            if (!selectedBasis || selectedBasisPrice <= 0 || !hasAnyFilledBasisPrice) return true;
        }

        if (agencyRule) {
            const agencyErrors = evaluateAgencyCustomization(agencyRule, watchedValues as any);
            if (Object.keys(agencyErrors).length > 0) return true;
        }

        return false;
    }, [agencyRule, watchedValues]);
    const listingContext = useMemo(() => {
        if (!accountId) return null;

        return {
            name: actorDisplayName || currentUser?.name || accountId,
            label: 'Agent',
            imageUrl: actorDisplayImage || currentUser?.avatarUrl || null,
            agencyName: isAgencyProfile ? (postingProfileName || null) : null,
        };
    }, [accountId, actorDisplayImage, actorDisplayName, currentUser, isAgencyProfile, postingProfileName]);

    function getSectionForErrorPath(path: string): string {
        if (path.startsWith("pricing.")) return "pricing";
        if (path.startsWith("structuredLocation")) return "location";
        if (path.startsWith("owners")) return "owners";
        if (path.startsWith("listingAgentAccountId") || path.startsWith("listingAgent")) return "listing-profile";
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
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    async function onSubmit(values: CreatePropertyFormValues) {
        startTransition(async () => {
            const result = await createPropertyAction(values, postingAgencyId, draftChangeId, activeWorkingProfileId);
            if (result.success) {
                toast({
                    title: 'Review Requested',
                    description: `The property "${values.title}" has been saved for approval.`,
                });
                router.push('/manage/properties');
            } else {
                if (result.changeId && result.changeId !== draftChangeId) {
                    syncDraftChangeId(result.changeId);
                }
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
        if (fromIndex < 0) return true;
        const result = await savePropertyCreateDraftAction({
            changeId: draftChangeId,
            postingAgencyId,
            workingProfileId: activeWorkingProfileId,
            data: form.getValues(),
        });

        if (!result.success) {
            toast({
                variant: 'destructive',
                title: 'Could not save draft',
                description: result.error || 'Please try again before continuing.',
            });
            return false;
        }

        if (result.changeId && result.changeId !== draftChangeId) {
            syncDraftChangeId(result.changeId);
        }

        form.reset(form.getValues());

        if (fromIndex === 0 && result.changeId) {
            router.push(`/manage/properties/${result.changeId}/edit?section=specifics`);
            return false;
        }

        return true;
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
                        submitDisabled={isCreateSubmitDisabled}
                        submitLabel={isPending ? 'Creating...' : 'Create Property'}
                        agencyRule={agencyRule}
                        onSectionAdvance={handleSectionAdvance}
                        allowSectionJumping={false}
                        canEditOwnership={false}
                        listingContext={listingContext}
                        postingProfile={accountId && effectivePostingProfileId ? {
                            name: postingProfileName || effectivePostingProfileId,
                            id: effectivePostingProfileId,
                            label: isAgencyProfile ? 'Agency' : 'Individual',
                            description: isAgencyProfile
                                ? 'This property will be created for the selected agency working profile.'
                                : 'This property will be created for the active individual profile.',
                        } : null}
                        listingAgentOptions={listingAgentOptions}
                    />
                </form>
            </Form>
        </div>
    );
}
