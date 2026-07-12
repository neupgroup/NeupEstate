
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CreateAgencySchema, type Agency, type CreateAgencyFormValues } from '@/types';
import { updateAgencyAction, deleteAgencyAction } from '@/app/actions';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/hooks/use-toast';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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
} from "@/components/ui/alert-dialog"

interface EditAgencyFormProps {
    agency: Agency;
}

export function EditAgencyForm({ agency }: EditAgencyFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);

    const form = useForm<CreateAgencyFormValues>({
        resolver: zodResolver(CreateAgencySchema),
        defaultValues: {
            name: agency.name || '',
            registeredName: agency.registeredName || '',
            logoUrl: agency.logoUrl || '',
            website: agency.website || '',
            contactEmail: agency.contactEmail || '',
            contactPhone: agency.contactPhone || '',
            mainLocation: agency.mainLocation || '',
            branches: Array.isArray(agency.branches) ? agency.branches.join('\\n') : '',
            contactPersonName: agency.contactPersonName || '',
            contactPersonRole: agency.contactPersonRole || '',
        },
    });

    async function onSubmit(values: CreateAgencyFormValues) {
        startSaveTransition(async () => {
            const result = await updateAgencyAction(agency.id, values);
            if (result.success) {
                toast({
                    title: 'Agency Updated',
                    description: `The agency "${values.name}" has been successfully updated.`,
                });
                setIsEditing(false);
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error updating agency',
                    description: result.error,
                });
            }
        });
    }

    const handleDelete = () => {
        startDeleteTransition(async () => {
            const result = await deleteAgencyAction(agency.id);
            if (result.success) {
                toast({
                    title: "Agency Deleted",
                    description: `"${agency.name}" has been permanently deleted.`,
                });
                router.push('/manage/agencies');
            } else {
                toast({
                    variant: 'destructive',
                    title: "Deletion Failed",
                    description: result.error,
                });
            }
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        form.reset({
            name: agency.name || '',
            registeredName: agency.registeredName || '',
            logoUrl: agency.logoUrl || '',
            website: agency.website || '',
            contactEmail: agency.contactEmail || '',
            contactPhone: agency.contactPhone || '',
            mainLocation: agency.mainLocation || '',
            branches: Array.isArray(agency.branches) ? agency.branches.join('\\n') : '',
            contactPersonName: agency.contactPersonName || '',
            contactPersonRole: agency.contactPersonRole || '',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h2 className="text-2xl font-semibold leading-none tracking-tight">Agency Details</h2>
                    <p className="text-sm text-muted-foreground">Viewing details for "{agency.name}".</p>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                            <Button onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" form="agency-edit-form" disabled={isSaving}>
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                            </Button>
                        </>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the agency
                                and remove its data from our servers.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete agency'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <Form {...form}>
                <form id="agency-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    {/* Basic Information Section */}
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="text-lg font-medium">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Skyline Properties" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="registeredName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Registered Name (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Skyline Properties LLC" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="logoUrl" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Logo URL</FormLabel>
                                    <FormControl><Input placeholder="https://example.com/logo.png" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="website" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Website URL (Optional)</FormLabel>
                                    <FormControl><Input placeholder="https://example.com" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </div>

                    {/* Contact Details Section */}
                        <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="text-lg font-medium">Contact Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="contactPersonName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person Name (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="contactPersonRole" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person Role (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Lead Agent" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="contactEmail" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Email (Optional)</FormLabel>
                                    <FormControl><Input type="email" placeholder="e.g., contact@skyline.com" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="contactPhone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Phone (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., (123) 456-7890" {...field} disabled={!isEditing} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </div>

                    {/* Location Section */}
                        <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="text-lg font-medium">Locations</h3>
                            <FormField control={form.control} name="mainLocation" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Main Office Address (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., 123 Main St, New York, NY 10001" {...field} disabled={!isEditing} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="branches" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Branch Locations (Optional)</FormLabel>
                                <FormControl><Textarea placeholder="Enter one branch location per line" {...field} disabled={!isEditing} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                </form>
            </Form>
        </div>
    );
}
