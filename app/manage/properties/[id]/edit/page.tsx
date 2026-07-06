
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect, useMemo } from 'react';
import { UpdatePropertySchema, type Property, type User, type UpdatePropertyFormValues } from '@/types';
import { cancelPropertyChangeDraftAction, createPropertyAction, getCurrentAccountId, getCurrentPropertyCreateDraftAction, savePropertyChangeDraftAction, getPropertyChangeContextAction, getPropertyEditCapabilitiesAction, getListingAgentOptionsAction, savePropertyCreateDraftAction } from '@/app/actions';
import { getPropertyById } from "@/services/property-service";
import { getUsers } from "@/services/user-service";
import { useAgencyCustomization } from '@/logica/core/hooks/use-agency-customization';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/logica/core/hooks/use-toast';
import { ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientLink } from '@/components/client-link';
import { ProgressivePropertySections } from '@/components/manage/progressive-property-sections';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_DRAFT_PROPERTY_VALUES: UpdatePropertyFormValues = {
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

function normalizeDraftStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    }
    return typeof value === 'string' && value.trim().length > 0 ? [value.trim()] : [];
}

function extractDraftNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value === 'object' && 'sqft' in value) {
        return extractDraftNumber((value as { sqft?: unknown }).sqft);
    }
    return 0;
}

function mapCreationDraftToEditableProperty(id: string, data: Record<string, any>): Property {
    const purposes = normalizeDraftStringArray(data.purposes).length
        ? normalizeDraftStringArray(data.purposes)
        : normalizeDraftStringArray(data.purpose);
    const categories = normalizeDraftStringArray(data.categories);
    const types = normalizeDraftStringArray(data.types);
    const postingAgencyId = typeof data.postingAgencyId === 'string' && data.postingAgencyId.trim()
        ? data.postingAgencyId.trim()
        : 'unknown';

    return {
        id,
        title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Untitled draft property',
        description: typeof data.description === 'string' ? data.description : '',
        price: extractDraftNumber(data.price ?? data.pricing?.listed),
        location: typeof data.location === 'string' ? data.location : '',
        bedrooms: extractDraftNumber(data.bedrooms),
        bathrooms: extractDraftNumber(data.bathrooms),
        area: extractDraftNumber(data.area),
        areaUnit: data.areaUnit,
        facing: data.facing,
        buildStart: data.buildStart,
        buildCompleted: data.buildCompleted,
        purpose: (purposes[0] || 'Sale') as Property['purpose'],
        purposes: purposes as Property['purposes'],
        category: (categories[0] || 'House') as Property['category'],
        type: (types[0] || 'Residential') as Property['type'],
        images: normalizeDraftStringArray(data.images),
        amenities: typeof data.amenities === 'string' ? data.amenities.split(',').map((item) => item.trim()).filter(Boolean) : normalizeDraftStringArray(data.amenities),
        agency: {
            id: postingAgencyId,
            name: postingAgencyId === 'unknown' ? '' : postingAgencyId,
            logoUrl: '',
        },
        listingAgent: typeof data.listingAgent === 'string' ? data.listingAgent : '',
        listingAgentId: typeof data.listingAgentAccountId === 'string' ? data.listingAgentAccountId : '',
        isOwnerListing: Boolean(data.isOwnerListing),
        isApproved: false,
        status: 'PENDING',
        floors: data.floors,
        onFloor: data.onFloor,
        roadAccess: data.roadAccess,
        kitchens: data.kitchens,
        diningRooms: data.diningRooms,
        livingRooms: data.livingRooms,
        carParkingSpots: data.carParkingSpots,
        bikeParkingSpots: data.bikeParkingSpots,
        landDetails: data.landDetails,
        plots: Array.isArray(data.plots) ? data.plots : [],
        apartmentDetails: data.apartmentDetails,
        apartmentUnits: Array.isArray(data.apartmentUnits) ? data.apartmentUnits : [],
        structuredLocation: data.structuredLocation,
        details: {
            isPrivate: data.isPrivate ?? false,
            showMap: data.showMap ?? true,
            showOwnerInformation: data.showOwnerInformation ?? true,
        },
        pricing: data.pricing,
        roadAccessDetails: data.roadAccessDetails,
        distancing: data.distancing,
        earnings: data.earnings,
        owners: Array.isArray(data.owners) ? data.owners : [],
        documents: Array.isArray(data.documents) ? data.documents : [],
    };
}

export default function EditPropertyPage() {
    const [property, setProperty] = useState<Property | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [baseValues, setBaseValues] = useState<UpdatePropertyFormValues | null>(null);
    const [pendingDraftValues, setPendingDraftValues] = useState<Partial<UpdatePropertyFormValues> | null>(null);
    const params = useParams<{ id: string }>();
    const propertyId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [accountId, setAccountId] = useState<string | null>(null);
    const [canEditOwnership, setCanEditOwnership] = useState(false);
    const [listingAgentOptions, setListingAgentOptions] = useState<Array<{ id: string; name: string; imageUrl: string | null; agencyId: string | null; agencyName: string | null }>>([]);
    const [changeContext, setChangeContext] = useState<{
        currentUserChange?: {
            id: string;
            status: string;
            isApproved: boolean | null;
            data: Record<string, any>;
            modifiedOn: string;
            accountId: string;
        } | null;
        recentActivity?: {
            hasCurrentUserChangeInLast7Days: boolean;
            hasOtherUserChangeInLast7Days: boolean;
            latestOutcome?: 'accepted' | 'declined' | 'pending' | null;
            latestOutcomeAt?: string | null;
            latestOutcomeMessage?: string | null;
        };
    } | null>(null);

    const { rule: agencyRule } = useAgencyCustomization(accountId, 'property');
    const activeWorkingProfileId = searchParams.get('workingProfile')?.trim() || null;
    const isCreateDraftFlow = changeContext?.currentUserChange?.status === 'creation_draft'
        || changeContext?.currentUserChange?.status === 'creation_pending'
        || changeContext?.currentUserChange?.status === 'creating';

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

    const form = useForm<UpdatePropertyFormValues>({
        resolver: zodResolver(UpdatePropertySchema),
    });

    function pickDirtyValues(values: any, dirty: any): any {
        if (Array.isArray(dirty) && Array.isArray(values)) {
            const picked = dirty.reduce<any[]>((acc, entry, index) => {
                if (entry === true) {
                    acc[index] = values[index];
                    return acc;
                }

                const nested = pickDirtyValues(values[index], entry);
                const hasNestedValue = Array.isArray(nested)
                    ? nested.length > 0
                    : isPlainObject(nested)
                        ? Object.keys(nested).length > 0
                        : nested !== undefined;

                if (hasNestedValue) {
                    acc[index] = nested;
                }
                return acc;
            }, []);

            return picked;
        }

        if (!dirty || typeof dirty !== 'object') return {};

        return Object.keys(dirty).reduce<Record<string, any>>((picked, key) => {
            if (dirty[key] === true) {
                picked[key] = values?.[key];
                return picked;
            }
            const nested = pickDirtyValues(values?.[key], dirty[key]);
            const hasNestedValue = Array.isArray(nested)
                ? nested.length > 0
                : isPlainObject(nested)
                    ? Object.keys(nested).length > 0
                    : nested !== undefined;
            if (hasNestedValue) picked[key] = nested;
            return picked;
        }, {});
    }

    function isPlainObject(value: unknown): value is Record<string, any> {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
    }

    function stripHtml(value: string) {
        return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function normalizeArrayLikeValue(value: unknown): unknown[] {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== 'object') return [];

        return Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => Number(left) - Number(right))
            .map(([, entry]) => entry)
            .filter((entry) => entry !== undefined);
    }

    function normalizeOwnerEntries(value: unknown): any[] {
        return normalizeArrayLikeValue(value)
            .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
            .map((entry) => ({
                ...entry,
                ownerClientId: typeof entry.ownerClientId === 'string' ? entry.ownerClientId.trim() : '',
            }))
            .filter((entry) => entry.ownerClientId.length > 0);
    }

    function normalizeDraftValues(values: Record<string, any>): Record<string, any> {
        return {
            ...values,
            owners: normalizeOwnerEntries(values.owners),
            images: normalizeArrayLikeValue(values.images),
            documents: normalizeArrayLikeValue(values.documents),
            plots: normalizeArrayLikeValue(values.plots),
            apartmentUnits: normalizeArrayLikeValue(values.apartmentUnits),
        };
    }

    function normalizeComparableValue(value: any): any {
        if (value == null) return value;
        if (typeof value === 'string') return stripHtml(value).trim();
        if (Array.isArray(value)) return value.map(normalizeComparableValue);
        if (isPlainObject(value)) {
            if ('sqft' in value && Object.keys(value).length <= 4) {
                return value.sqft;
            }
            return Object.fromEntries(
                Object.entries(value)
                    .filter(([, entry]) => entry !== undefined)
                    .map(([key, entry]) => [key, normalizeComparableValue(entry)]),
            );
        }
        return value;
    }

    function valuesAreEquivalent(previous: any, current: any): boolean {
        return formatValue(normalizeComparableValue(previous)) === formatValue(normalizeComparableValue(current));
    }

    function hasDraftFields(data: Record<string, any>): boolean {
        return Object.keys(data).length > 0;
    }

    function getActualChangeDraftValues(values: UpdatePropertyFormValues): Record<string, any> {
        if (!baseValues) {
            return normalizeDraftValues(pickDirtyValues(values, form.formState.dirtyFields));
        }

        const normalizedBaseValues = normalizeDraftValues(baseValues as Record<string, any>);
        const normalizedCurrentValues = normalizeDraftValues(values as Record<string, any>);
        const changedValues: Record<string, any> = {};

        for (const key of Object.keys(normalizedCurrentValues)) {
            if (!valuesAreEquivalent(normalizedBaseValues[key], normalizedCurrentValues[key])) {
                changedValues[key] = normalizedCurrentValues[key];
            }
        }

        return changedValues;
    }

    function prettifyPath(path: string): string {
        if (path === 'purposes' || path === 'purpose') return 'Property purpose';
        if (path === 'categories' || path === 'category') return 'Property type';
        if (path === 'types' || path === 'type') return 'Property nature';
        if (path === 'buildStart') return 'Build start year';
        if (path === 'buildCompleted') return 'Build end year';
        if (path === 'onFloor') return 'Floor number';
        if (path === 'floors') return 'Total floors';
        if (path === 'roadAccess') return 'Road access';
        if (path === 'title') return 'Title';
        if (path === 'description') return 'Description';
        if (path === 'amenities') return 'Amenities';
        if (path === 'images') return 'Photos';
        if (path === 'documents') return 'Documents';
        if (path === 'owners') return 'Owners';
        if (path === 'pricing.listed') return 'Rental price';
        if (path === 'pricing.priceDisplayMode') return 'Price display mode';
        if (path === 'pricing.currency') return 'Currency';
        if (path === 'pricing.basis') return 'Price basis';
        if (path.startsWith('pricing.')) return `Pricing ${path.split('.').slice(1).join(' ')}`;
        if (path.startsWith('structuredLocation.')) return `Location ${path.split('.').slice(1).join(' ')}`;
        if (path.startsWith('landDetails.')) return `Land details ${path.split('.').slice(1).join(' ')}`;
        if (path.startsWith('plots.')) return `Plots ${path.split('.').slice(1).join(' ')}`;
        if (path.startsWith('apartmentUnits.')) return `Apartment units ${path.split('.').slice(1).join(' ')}`;
        return path
            .split('.')
            .filter(Boolean)
            .pop()
            ?.replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim() || 'Field';
    }

    function formatValue(value: any): string {
        if (value == null || value === '') return 'Not set';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
            if (value.length === 0) return 'None';
            return value.map((entry) => formatValue(entry)).join(', ');
        }
        if (isPlainObject(value)) {
            if ('sqft' in value && Object.keys(value).length <= 4) {
                return `${value.sqft ?? '0'} sqft`;
            }
            return Object.entries(value)
                .filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
                .map(([key, entry]) => `${key}: ${formatValue(entry)}`)
                .join(', ') || 'None';
        }
        return String(value);
    }

    function formatPreviousValue(value: any): string {
        if (value == null || value === '') return 'unset';
        return formatValue(value);
    }

    function formatPreviousValueForPath(path: string, value: any): string {
        if (path === 'roadAccess' && value != null && value !== '') {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? `${numeric} meters` : formatPreviousValue(value);
        }
        return formatPreviousValue(value);
    }

    function collectChangedFields(base: any, next: any, prefix = ''): Array<{ path: string; previous: any; current: any }> {
        const changes: Array<{ path: string; previous: any; current: any }> = [];
        const baseValue = normalizeComparableValue(base);
        const nextValue = normalizeComparableValue(next);

        if (Array.isArray(baseValue) || Array.isArray(nextValue)) {
            const baseJson = JSON.stringify(baseValue ?? null);
            const nextJson = JSON.stringify(nextValue ?? null);
            if (baseJson !== nextJson) {
                changes.push({ path: prefix || 'field', previous: base, current: next });
            }
            return changes;
        }

        if (isPlainObject(baseValue) || isPlainObject(nextValue)) {
            const keys = new Set([
                ...Object.keys(isPlainObject(baseValue) ? baseValue : {}),
                ...Object.keys(isPlainObject(nextValue) ? nextValue : {}),
            ]);

            for (const key of keys) {
                const path = prefix ? `${prefix}.${key}` : key;
                changes.push(...collectChangedFields(
                    isPlainObject(base) ? base?.[key] : undefined,
                    isPlainObject(next) ? next?.[key] : undefined,
                    path,
                ));
            }
            return changes;
        }

        if (baseValue !== nextValue) {
            changes.push({ path: prefix || 'field', previous: base, current: next });
        }

        return changes;
    }

    useEffect(() => {
        if (!propertyId) return;

        async function loadData() {
            const [propertyData, userData, resolvedAccountId, capabilities] = await Promise.all([
                getPropertyById(propertyId, { includeInactive: true }),
                getUsers(),
                getCurrentAccountId(),
                getPropertyEditCapabilitiesAction(),
            ]);
            if (resolvedAccountId) setAccountId(resolvedAccountId);
            setCanEditOwnership(capabilities.success ? capabilities.canEditOwnership : false);

            if (!propertyData) {
                const draftResult = await getCurrentPropertyCreateDraftAction(propertyId);
                if (draftResult.success && draftResult.changeId && draftResult.data) {
                    const draftValues = normalizeDraftValues({
                        ...DEFAULT_DRAFT_PROPERTY_VALUES,
                        ...draftResult.data,
                    }) as UpdatePropertyFormValues;
                    const draftProperty = mapCreationDraftToEditableProperty(draftResult.changeId, draftValues as Record<string, any>);

                    setProperty(draftProperty);
                    setUsers(userData);
                    setChangeContext({
                        currentUserChange: {
                            id: draftResult.changeId,
                            status: draftResult.status ?? 'creation_draft',
                            isApproved: null,
                            data: draftValues as Record<string, any>,
                            modifiedOn: draftResult.modifiedOn ?? new Date().toISOString(),
                            accountId: draftResult.accountId ?? resolvedAccountId ?? '',
                        },
                        recentActivity: {
                            hasCurrentUserChangeInLast7Days: true,
                            hasOtherUserChangeInLast7Days: false,
                            latestOutcome: 'pending',
                            latestOutcomeAt: draftResult.modifiedOn ?? null,
                            latestOutcomeMessage: 'Your changes are awaiting review.',
                        },
                    });
                    form.reset(draftValues);
                    setBaseValues(draftValues);
                    setPendingDraftValues(null);
                    return;
                }

                toast({ variant: 'destructive', title: 'Error', description: 'Property not found.' });
                router.push('/manage/properties');
                return;
            }

            const reviewContext = await getPropertyChangeContextAction(propertyId);
            if (reviewContext.success) setChangeContext(reviewContext);

            setProperty(propertyData);
            setUsers(userData);

            const resolvedBaseValues = {
                title: propertyData.title,
                description: propertyData.description,
                bedrooms: propertyData.bedrooms,
                bathrooms: propertyData.bathrooms,
                kitchens: propertyData.kitchens,
                diningRooms: propertyData.diningRooms,
                livingRooms: propertyData.livingRooms,
                carParkingSpots: propertyData.carParkingSpots,
                bikeParkingSpots: propertyData.bikeParkingSpots,
                // area is stored as a sqft number in the DB — wrap it back into AreaValue shape
                area: propertyData.area ? { sqft: propertyData.area } : undefined,
                purpose: propertyData.purpose,
                purposes: propertyData.purposes?.length ? propertyData.purposes : [propertyData.purpose],
                categories: propertyData.category ? [propertyData.category] : [],
                types: propertyData.type ? [propertyData.type] : [],
                amenities: Array.isArray(propertyData.amenities) ? propertyData.amenities.join(', ') : '',
                images: Array.isArray(propertyData.images) ? propertyData.images : [],
                listingAgent: propertyData.listingAgent || '',
                listingAgentAccountId: propertyData.listingAgentId || '',
                isOwnerListing: propertyData.isOwnerListing || false,
                isPrivate: Boolean((propertyData.details as any)?.isPrivate),
                showMap: propertyData.details?.showMap ?? true,
                showOwnerInformation: propertyData.details?.showOwnerInformation ?? true,
                floors: propertyData.floors ?? undefined,
                onFloor: propertyData.onFloor ?? undefined,
                roadAccess: propertyData.roadAccess ?? undefined,
                landDetails: propertyData.landDetails ? {
                    ...propertyData.landDetails,
                    // landDetails.area is also stored as a sqft number — wrap it back
                    area: propertyData.landDetails.area != null
                        ? (typeof propertyData.landDetails.area === 'number'
                            ? { sqft: propertyData.landDetails.area }
                            : propertyData.landDetails.area)
                        : undefined,
                } : {},
                plots: (propertyData.plots ?? []).map((p: any) => ({
                    ...p,
                    area: p.area != null
                        ? (typeof p.area === 'number' ? { sqft: p.area } : p.area)
                        : undefined,
                })),
                apartmentDetails: propertyData.apartmentDetails || {},
                apartmentUnits: (propertyData.apartmentUnits ?? []).map((u: any) => ({
                    ...u,
                    area: u.area != null
                        ? (typeof u.area === 'number' ? { sqft: u.area } : u.area)
                        : undefined,
                })),
                structuredLocation: propertyData.structuredLocation || {},
                pricing: propertyData.pricing ? {
                    ...propertyData.pricing,
                    options: Array.isArray(propertyData.pricing.options) ? propertyData.pricing.options.join(', ') : '',
                } : { listed: propertyData.price },
                roadAccessDetails: propertyData.roadAccessDetails || {},
                distancing: propertyData.distancing || {},
                earnings: propertyData.earnings || {},
                owners: propertyData.owners || [],
                documents: propertyData.documents || [],
                areaUnit: propertyData.areaUnit,
                facing: propertyData.facing,
                buildStart: propertyData.buildStart,
                buildCompleted: propertyData.buildCompleted,
            };

            const currentDraft = reviewContext.success ? reviewContext.currentUserChange?.data : null;
            const normalizedBaseValues = normalizeDraftValues(resolvedBaseValues);
            const normalizedDraft = currentDraft ? normalizeDraftValues({ ...normalizedBaseValues, ...currentDraft }) : normalizedBaseValues;
            form.reset(normalizedDraft);
            setBaseValues(normalizedBaseValues as UpdatePropertyFormValues);
            setPendingDraftValues((currentDraft ? normalizeDraftValues(currentDraft as Record<string, any>) : null) as Partial<UpdatePropertyFormValues> | null);
        }
        loadData();
    }, [propertyId, router, toast, form]);

    useEffect(() => {
        if (!property || !canEditOwnership) {
            setListingAgentOptions([]);
            return;
        }

        const activeProperty = property;

        async function loadListingAgents() {
            const result = await getListingAgentOptionsAction({
                agencyId: activeProperty.agency?.id && activeProperty.agency.id !== 'unknown' ? activeProperty.agency.id : null,
                currentAgentId: activeProperty.listingAgentId ?? null,
            });

            if (result.success) {
                setListingAgentOptions(result.agents);
            }
        }

        loadListingAgents();
    }, [canEditOwnership, property]);

    async function onSubmit(values: UpdatePropertyFormValues) {
        if (!property) return;
        startSaveTransition(async () => {
            if (isCreateDraftFlow) {
                const result = await createPropertyAction(
                    values,
                    typeof changeContext?.currentUserChange?.data?.postingAgencyId === 'string'
                        ? changeContext.currentUserChange.data.postingAgencyId
                        : property.agency?.id ?? null,
                    changeContext?.currentUserChange?.id ?? null,
                    activeWorkingProfileId,
                );

                if (result.success) {
                    toast({
                        title: 'Review Requested',
                        description: `The property "${values.title}" has been saved for approval.`,
                    });
                    router.push('/manage/properties');
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Could not request review',
                        description: result.error,
                    });
                }
                return;
            }

            const data = property.isApproved
                ? getActualChangeDraftValues(values)
                : values;

            if (property.isApproved && !hasDraftFields(data)) {
                toast({
                    title: 'No changes to review',
                    description: 'Edit a field before requesting review.',
                });
                return;
            }

            const result = await savePropertyChangeDraftAction({
                propertyId: property.id,
                status: 'changing',
                data,
            });

            if (result.success) {
                toast({
                    title: 'Review Requested',
                    description: `Your changes for "${values.title}" have been sent for review.`,
                });
                router.push(`/manage/properties/${property.id}`);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Could not request review',
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
        if (!property) return;
        void fromIndex;
        void toIndex;
        const values = form.getValues();
        const data = property.isApproved
            ? getActualChangeDraftValues(values)
            : values;

        if (!isCreateDraftFlow && property.isApproved && !hasDraftFields(data)) {
            form.reset(values);
            return true;
        }

        const result = isCreateDraftFlow
            ? await savePropertyCreateDraftAction({
                changeId: changeContext?.currentUserChange?.id ?? null,
                postingAgencyId: typeof changeContext?.currentUserChange?.data?.postingAgencyId === 'string'
                    ? changeContext.currentUserChange.data.postingAgencyId
                    : property.agency?.id ?? null,
                workingProfileId: activeWorkingProfileId,
                data,
            })
            : await savePropertyChangeDraftAction({
                propertyId: property.id,
                status: 'changing',
                data,
            });

        if (!result.success) {
            toast({
                variant: 'destructive',
                title: 'Could not save request',
                description: result.error || 'Please try again before continuing.',
            });
            return;
        }

        if (result.changeId) {
            setChangeContext((current) => current ? ({
                ...current,
                currentUserChange: current.currentUserChange ? {
                    ...current.currentUserChange,
                    id: result.changeId!,
                    status: isCreateDraftFlow
                        ? current.currentUserChange.status === 'creation_pending'
                            ? 'creation_pending'
                            : 'creation_draft'
                        : 'changing',
                    data,
                } : {
                    id: result.changeId!,
                    status: isCreateDraftFlow ? 'creation_draft' : 'changing',
                    isApproved: null,
                    data,
                    modifiedOn: new Date().toISOString(),
                    accountId: accountId || '',
                },
            }) : current);
        }

        form.reset(values);
        setPendingDraftValues(hasDraftFields(data) ? data : null);
        return true;
    }

    async function handleDropCreationDraft() {
        const changeId = changeContext?.currentUserChange?.id;
        if (!changeId) {
            router.push('/manage/properties');
            return true;
        }

        const result = await cancelPropertyChangeDraftAction(changeId);
        if (!result.success) {
            toast({
                variant: 'destructive',
                title: 'Could not drop property',
                description: result.error || 'Please try again.',
            });
            return false;
        }

        toast({
            title: 'Property dropped',
            description: 'The unrequested property draft has been removed.',
        });
        router.push('/manage/properties');
        return true;
    }

    const pendingFieldChanges = useMemo(() => {
        const changeData = pendingDraftValues || changeContext?.currentUserChange?.data;
        if (!baseValues || !changeData) return [];
        return collectChangedFields(baseValues, { ...baseValues, ...changeData })
            .map((change) => ({
                ...change,
                label: prettifyPath(change.path),
            }))
            .filter((change) => formatValue(normalizeComparableValue(change.previous)) !== formatValue(normalizeComparableValue(change.current)));
    }, [baseValues, pendingDraftValues, changeContext?.currentUserChange?.data]);

    const fieldChangeNotes = useMemo(() => {
        if (!pendingFieldChanges.length) return {};
        const notes: Record<string, string> = {};
        for (const change of pendingFieldChanges) {
            const label = prettifyPath(change.path).toLowerCase();
            notes[change.path] = `Previously, the ${label} was ${formatPreviousValueForPath(change.path, normalizeComparableValue(change.previous))}.`;
        }
        return notes;
    }, [pendingFieldChanges]);

    const reviewMessage = useMemo(() => {
        const latest = changeContext?.recentActivity?.latestOutcomeMessage;
        if (latest && latest !== 'Your changes have been declined.') return latest;
        if (changeContext?.recentActivity?.hasOtherUserChangeInLast7Days) {
            return 'Information for this property has been changed in the last 7 days.';
        }
        return null;
    }, [changeContext]);

    const showPreviouslySection = Boolean(
        changeContext?.currentUserChange &&
        changeContext.currentUserChange.isApproved === null
    );

    const listingContext = useMemo(() => {
        if (!property) return null;

        const listingAgent = property.listingAgent?.trim();
        const matchedListingAgent = property.listingAgentId
            ? listingAgentOptions.find((agent) => agent.id === property.listingAgentId)
            : null;
        const agencyName = property.agency?.name?.trim();
        const primaryOwner = property.owners?.find((owner) => owner.isPrimaryOwner)?.clientName?.trim();
        const fallbackOwner = property.owners?.find((owner) => owner.clientName?.trim())?.clientName?.trim();
        const ownerName = primaryOwner || fallbackOwner;

        if (listingAgent) {
            return {
                name: matchedListingAgent?.name || listingAgent,
                label: 'Agent',
                imageUrl: matchedListingAgent?.imageUrl || null,
                agencyName: agencyName ?? null,
            };
        }

        if (property.isOwnerListing) {
            return {
                name: ownerName || 'No listing agent/owner found.',
                label: 'Owner',
                imageUrl: null,
                agencyName: null,
            };
        }

        return {
            name: 'No listing agent/owner found.',
            label: 'Listing profile unavailable',
            imageUrl: null,
            agencyName: null,
        };
    }, [listingAgentOptions, property]);

    const postingProfile = useMemo(() => {
        if (!property) return null;

        const draftPostingAgencyId = typeof changeContext?.currentUserChange?.data?.postingAgencyId === 'string'
            ? changeContext.currentUserChange.data.postingAgencyId.trim() || null
            : null;
        const propertyAgencyId = property.agency?.id && property.agency.id !== 'unknown'
            ? property.agency.id
            : null;
        const propertyAgencyName = property.agency?.name?.trim() || null;
        const resolvedAgencyId = draftPostingAgencyId || propertyAgencyId;

        if (!resolvedAgencyId) {
            return null;
        }

        return {
            name: resolvedAgencyId === propertyAgencyId && propertyAgencyName ? propertyAgencyName : resolvedAgencyId,
            id: resolvedAgencyId,
            label: 'Agency',
            description: isCreateDraftFlow
                ? 'This request will be submitted under the selected agency profile.'
                : 'This property is currently posted under this agency.',
            canChange: isCreateDraftFlow,
        };
    }, [changeContext, isCreateDraftFlow, property]);

    if (!property) {
        return (
            <div className="space-y-6 max-w-6xl mx-auto">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onSubmitInvalid)} className="space-y-6">
                    {(reviewMessage || showPreviouslySection) && (
                        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            {reviewMessage || 'Changes on this property are being reviewed.'}
                        </div>
                    )}
                    <div className="flex flex-col gap-4 rounded-none border-0 px-0 py-0 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="text-2xl">Edit Property</CardTitle>
                            <CardDescription className="mt-1">
                                Update the details for "{property.title}".
                            </CardDescription>
                            {property.isApproved && (
                                <a
                                    href={`/properties/${property.slug || property.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                    View on site
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                        </div>
                        <div className="flex flex-row sm:flex-col lg:flex-row gap-2 self-start sm:self-end" />
                    </div>

                    <ProgressivePropertySections
                        form={form}
                        users={users}
                        isEditForm={true}
                        isSubmitting={isSaving}
                        submitLabel={isSaving ? 'Requesting Review...' : 'Request Review'}
                        agencyRule={agencyRule}
                        onSectionAdvance={handleSectionAdvance}
                        canDropCreationDraft={changeContext?.currentUserChange?.status === 'creation_draft'}
                        onDropCreationDraft={handleDropCreationDraft}
                        fieldChangeNotes={fieldChangeNotes}
                        previousAmenities={baseValues?.amenities}
                        previousImages={baseValues?.images}
                        listingContext={listingContext}
                        postingProfile={postingProfile}
                        canEditOwnership={canEditOwnership}
                        listingAgentOptions={listingAgentOptions}
                    />
                </form>
            </Form>
        </div>
    );
}
