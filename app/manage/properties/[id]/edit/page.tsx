
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { UpdatePropertySchema, type Property, type User, type UpdatePropertyFormValues } from '@/types';
import { updatePropertyAction, approvePropertyAction, deletePropertyAction, rewritePropertyDetailsAction, getCurrentAccountId, savePropertyChangeDraftAction, getPropertyChangeDraftAction } from '@/app/actions';
import { getPropertyById } from "@/services/property-service";
import { getUsers } from "@/services/user-service";
import { useAgencyCustomization } from '@/hooks/use-agency-customization';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Trash2, PenSquare, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';
import { SourceOriginationManager } from "@/components/manage/source-origination-manager";
import { ProgressivePropertySections } from '@/components/manage/progressive-property-sections';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditPropertyPage() {
    const [property, setProperty] = useState<Property | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const params = useParams<{ id: string }>();
    const propertyId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isApproving, startApproveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isRewriting, startRewriteTransition] = useTransition();
    const [accountId, setAccountId] = useState<string | null>(null);
    const [changeId, setChangeId] = useState<string | null>(searchParams.get('request') || searchParams.get('changes'));

    const { rule: agencyRule } = useAgencyCustomization(accountId, 'property');

    const form = useForm<UpdatePropertyFormValues>({
        resolver: zodResolver(UpdatePropertySchema),
    });

    function pickDirtyValues(values: any, dirty: any): Record<string, any> {
        if (!dirty || typeof dirty !== 'object') return {};
        return Object.keys(dirty).reduce<Record<string, any>>((picked, key) => {
            if (dirty[key] === true) {
                picked[key] = values?.[key];
                return picked;
            }
            const nested = pickDirtyValues(values?.[key], dirty[key]);
            if (Object.keys(nested).length > 0) picked[key] = nested;
            return picked;
        }, {});
    }

    function replaceRequestParam(requestId: string) {
        const params = new URLSearchParams(window.location.search);
        params.set('request', requestId);
        params.delete('changes');
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }

    useEffect(() => {
        if (!propertyId) return;

        async function loadData() {
            const [propData, userData, resolvedAccountId] = await Promise.all([
                getPropertyById(propertyId, { includeInactive: true }),
                getUsers(),
                getCurrentAccountId(),
            ]);

            if (resolvedAccountId) setAccountId(resolvedAccountId);

            if (!propData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Property not found.' });
                router.push('/manage/properties');
                return;
            }

            setProperty(propData);
            setUsers(userData);

            const baseValues = {
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

            const draftId = searchParams.get('request') || searchParams.get('changes');
            if (draftId) {
                const draft = await getPropertyChangeDraftAction(draftId);
                if (draft.success && draft.data && (!draft.propertyId || draft.propertyId === propData.id)) {
                    form.reset({
                        ...baseValues,
                        ...(draft.data as Partial<UpdatePropertyFormValues>),
                    });
                    setChangeId(draftId);
                    return;
                }
            }

            form.reset(baseValues);
        }
        loadData();
    }, [propertyId, router, toast, form, searchParams]);

    async function onSubmit(values: UpdatePropertyFormValues) {
        if (!property) return;
        startSaveTransition(async () => {
            const result = await updatePropertyAction(property.id, values);
            if (result.success) {
                toast({
                    title: 'Property Updated',
                    description: `The property "${values.title}" has been successfully updated.`,
                });
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error updating property',
                    description: result.error,
                });
            }
        });
    }

    async function handleSectionAdvance(fromIndex: number, toIndex: number) {
        if (!property) return;

        const values = form.getValues();
        const data = property.isApproved
            ? pickDirtyValues(values, form.formState.dirtyFields)
            : values;

        const result = await savePropertyChangeDraftAction({
            changeId,
            propertyId: property.id,
            status: property.isApproved ? 'pending' : 'pending_edits',
            data,
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

    const handleApprove = () => {
        if (!property) return;
        startApproveTransition(async () => {
            const result = await approvePropertyAction(property.id);
            if (result.success) {
                toast({
                    title: "Property Approved",
                    description: `"${property.title}" is now live on the site.`,
                });
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: "Approval Failed",
                    description: result.error,
                });
            }
        });
    };

    const handleDelete = () => {
        if (!property) return;
        startDeleteTransition(async () => {
            const result = await deletePropertyAction(property.id);
            if (result.success) {
                toast({
                    title: "Property Deleted",
                    description: `"${property.title}" has been permanently deleted.`,
                });
                router.push('/manage/properties');
            } else {
                toast({
                    variant: 'destructive',
                    title: "Deletion Failed",
                    description: result.error,
                });
            }
        });
    };
    
    const handleRewrite = () => {
        if (!property) return;
        startRewriteTransition(async () => {
            toast({
                title: "AI is rewriting...",
                description: "This may take a moment.",
            });
            const result = await rewritePropertyDetailsAction(property.id);
            if (result.success && result.data) {
                form.setValue('title', result.data.rewrittenTitle, { shouldValidate: true, shouldDirty: true });
                form.setValue('description', result.data.rewrittenDescription, { shouldValidate: true, shouldDirty: true });
                toast({
                    title: "Rewrite Successful",
                    description: "The property title and description have been updated.",
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: "Rewrite Failed",
                    description: result.error,
                });
            }
        });
    };

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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                <div>
                                    <CardTitle>Edit Property</CardTitle>
                                    <CardDescription>Update the details for "{property.title}".</CardDescription>
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
                                <div className="flex flex-row sm:flex-col lg:flex-row gap-2 self-start sm:self-end">
                                    <Button variant="secondary" type="button" onClick={handleRewrite} disabled={isRewriting || isSaving}>
                                        {isRewriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenSquare className="mr-2 h-4 w-4" />}
                                        AI Rewrite
                                    </Button>
                                    {!property.isApproved && (
                                        <Button variant="outline" type="button" onClick={handleApprove} disabled={isApproving}>
                                            {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                            Approve
                                        </Button>
                                    )}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" type="button" disabled={isDeleting}>
                                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the property
                                                and remove its data from our servers.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                                Yes, delete property
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <ProgressivePropertySections
                        form={form}
                        users={users}
                        isEditForm={true}
                        isSubmitting={isSaving || isRewriting}
                        submitLabel={isSaving ? 'Saving Changes...' : 'Save Changes'}
                        agencyRule={agencyRule}
                        onSectionAdvance={handleSectionAdvance}
                    />
                </form>
            </Form>

            {property.sourceUrl && (
                <SourceOriginationManager property={property} />
            )}
        </div>
    );
}
