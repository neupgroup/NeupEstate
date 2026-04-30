
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { UpdatePropertySchema, type Property, type User, type UpdatePropertyFormValues } from '@/types';
import { updatePropertyAction, approvePropertyAction, deletePropertyAction, rewritePropertyDetailsAction } from '@/app/actions';
import { getPropertyById } from "@/services/property-service";
import { getUsers } from "@/services/user-service";

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
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isApproving, startApproveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isRewriting, startRewriteTransition] = useTransition();

    const form = useForm<UpdatePropertyFormValues>({
        resolver: zodResolver(UpdatePropertySchema),
    });

    useEffect(() => {
        if (!propertyId) return;

        async function loadData() {
            const [propData, userData] = await Promise.all([
                getPropertyById(propertyId, { includeInactive: true }),
                getUsers(),
            ]);

            if (!propData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Property not found.' });
                router.push('/manage/properties');
                return;
            }

            setProperty(propData);
            setUsers(userData);

            form.reset({
                title: propData.title,
                description: propData.description,
                bedrooms: propData.bedrooms,
                bathrooms: propData.bathrooms,
                kitchens: propData.kitchens,
                diningRooms: propData.diningRooms,
                livingRooms: propData.livingRooms,
                carParkingSpots: propData.carParkingSpots,
                bikeParkingSpots: propData.bikeParkingSpots,
                area: propData.area,
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
                metaTitle: propData.metaTitle || '',
                metaDescription: propData.metaDescription || '',
                metaTags: Array.isArray(propData.metaTags) ? propData.metaTags.join(', ') : '',
                slug: propData.slug || '',
                landDetails: propData.landDetails || {},
                plots: propData.plots || [],
                apartmentDetails: propData.apartmentDetails || {},
                apartmentUnits: propData.apartmentUnits || [],
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
            });
        }
        loadData();
    }, [propertyId, router, toast, form]);

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
                form.setValue('metaTitle', result.data.rewrittenMetaTitle, { shouldValidate: true, shouldDirty: true });
                form.setValue('metaDescription', result.data.rewrittenMetaDescription, { shouldValidate: true, shouldDirty: true });
                form.setValue('metaTags', result.data.rewrittenMetaTags.join(', '), { shouldValidate: true, shouldDirty: true });
                if (result.data.finalSlug) {
                    form.setValue('slug', result.data.finalSlug, { shouldValidate: true, shouldDirty: true });
                }
                toast({
                    title: "Rewrite Successful",
                    description: "The property details and SEO fields have been updated.",
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
                    />
                </form>
            </Form>

            {property.sourceUrl && (
                <SourceOriginationManager property={property} />
            )}
        </div>
    );
}
