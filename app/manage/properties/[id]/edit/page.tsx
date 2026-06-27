
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTransition, useState, useEffect, useMemo } from 'react';
import { UpdatePropertySchema, type Property, type User, type UpdatePropertyFormValues } from '@/types';
import { getCurrentAccountId, savePropertyChangeDraftAction, getPropertyChangeContextAction } from '@/app/actions';
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

export default function EditPropertyPage() {
    const [property, setProperty] = useState<Property | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [baseValues, setBaseValues] = useState<UpdatePropertyFormValues | null>(null);
    const [pendingDraftValues, setPendingDraftValues] = useState<Partial<UpdatePropertyFormValues> | null>(null);
    const params = useParams<{ id: string }>();
    const propertyId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [accountId, setAccountId] = useState<string | null>(null);
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
            const [propData, userData, resolvedAccountId, reviewContext] = await Promise.all([
                getPropertyById(propertyId, { includeInactive: true }),
                getUsers(),
                getCurrentAccountId(),
                getPropertyChangeContextAction(propertyId),
            ]);

            if (resolvedAccountId) setAccountId(resolvedAccountId);
            if (reviewContext.success) setChangeContext(reviewContext);

            if (!propData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Property not found.' });
                router.push('/manage/properties');
                return;
            }

            setProperty(propData);
            setUsers(userData);

            const resolvedBaseValues = {
                title: propData.title,
                description: propData.description,
                bedrooms: propData.bedrooms,
                bathrooms: propData.bathrooms,
                kitchens: propData.kitchens,
                diningRooms: propData.diningRooms,
                livingRooms: propData.livingRooms,
                carParkingSpots: propData.carParkingSpots,
                bikeParkingSpots: propData.bikeParkingSpots,
                // area is stored as a sqft number in the DB — wrap it back into AreaValue shape
                area: propData.area ? { sqft: propData.area } : undefined,
                purpose: propData.purpose,
                purposes: propData.purposes?.length ? propData.purposes : [propData.purpose],
                categories: propData.category ? [propData.category] : [],
                types: propData.type ? [propData.type] : [],
                amenities: Array.isArray(propData.amenities) ? propData.amenities.join(', ') : '',
                images: Array.isArray(propData.images) ? propData.images : [],
                listingAgent: propData.listingAgent || '',
                isOwnerListing: propData.isOwnerListing || false,
                isPrivate: Boolean((propData.details as any)?.isPrivate),
                showMap: propData.details?.showMap ?? true,
                showOwnerInformation: propData.details?.showOwnerInformation ?? true,
                floors: propData.floors ?? undefined,
                onFloor: propData.onFloor ?? undefined,
                roadAccess: propData.roadAccess ?? undefined,
                landDetails: propData.landDetails ? {
                    ...propData.landDetails,
                    // landDetails.area is also stored as a sqft number — wrap it back
                    area: propData.landDetails.area != null
                        ? (typeof propData.landDetails.area === 'number'
                            ? { sqft: propData.landDetails.area }
                            : propData.landDetails.area)
                        : undefined,
                } : {},
                plots: (propData.plots ?? []).map((p: any) => ({
                    ...p,
                    area: p.area != null
                        ? (typeof p.area === 'number' ? { sqft: p.area } : p.area)
                        : undefined,
                })),
                apartmentDetails: propData.apartmentDetails || {},
                apartmentUnits: (propData.apartmentUnits ?? []).map((u: any) => ({
                    ...u,
                    area: u.area != null
                        ? (typeof u.area === 'number' ? { sqft: u.area } : u.area)
                        : undefined,
                })),
                structuredLocation: propData.structuredLocation || {},
                pricing: propData.pricing ? {
                    ...propData.pricing,
                    options: Array.isArray(propData.pricing.options) ? propData.pricing.options.join(', ') : '',
                } : { listed: propData.price },
                roadAccessDetails: propData.roadAccessDetails || {},
                distancing: propData.distancing || {},
                earnings: propData.earnings || {},
                owners: propData.owners || [],
                documents: propData.documents || [],
                areaUnit: propData.areaUnit,
                facing: propData.facing,
                buildStart: propData.buildStart,
                buildCompleted: propData.buildCompleted,
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

    async function onSubmit(values: UpdatePropertyFormValues) {
        if (!property) return;
        startSaveTransition(async () => {
            const data = property.isApproved
                ? pickDirtyValues(values, form.formState.dirtyFields)
                : values;

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

        const values = form.getValues();
        const data = property.isApproved
            ? pickDirtyValues(values, form.formState.dirtyFields)
            : values;

        const result = await savePropertyChangeDraftAction({
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
                    data,
                } : {
                    id: result.changeId!,
                    status: 'changing',
                    isApproved: null,
                    data,
                    modifiedOn: new Date().toISOString(),
                    accountId: accountId || '',
                },
            }) : current);
        }
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
                        fieldChangeNotes={fieldChangeNotes}
                        previousAmenities={baseValues?.amenities}
                        previousImages={baseValues?.images}
                    />
                </form>
            </Form>
        </div>
    );
}
