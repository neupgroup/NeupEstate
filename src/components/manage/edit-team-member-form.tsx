
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { UpdateTeamMemberSchema, type TeamMember, type UpdateTeamMemberFormValues, type User } from '@/types';
import { updateTeamMemberAction, deleteTeamMemberAction } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';

interface EditTeamMemberFormProps {
    member: TeamMember;
    users: User[];
}

export function EditTeamMemberForm({ member, users }: EditTeamMemberFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [isRegistered, setIsRegistered] = useState(member.registered);

    const form = useForm<UpdateTeamMemberFormValues>({
        resolver: zodResolver(UpdateTeamMemberSchema),
        defaultValues: {
            registered: member.registered,
            userId: member.userId,
            name: member.name,
            photoUrl: member.photoUrl,
            position: member.position,
            about: member.about,
            moreDetails: member.moreDetails,
            socialMedia: {
                linkedin: member.socialMedia?.linkedin || '',
                twitter: member.socialMedia?.twitter || '',
                facebook: member.socialMedia?.facebook || '',
            }
        },
    });

    useEffect(() => {
        if (isEditing) {
             form.reset({
                registered: isRegistered,
                userId: isRegistered ? member.userId : undefined,
                name: isRegistered ? '' : member.name,
                photoUrl: isRegistered ? '' : member.photoUrl,
                position: member.position,
                about: member.about,
                moreDetails: member.moreDetails,
                socialMedia: {
                    linkedin: member.socialMedia?.linkedin || '',
                    twitter: member.socialMedia?.twitter || '',
                    facebook: member.socialMedia?.facebook || '',
                }
            });
        }
    }, [isRegistered, isEditing, member, form]);

    async function onSubmit(values: UpdateTeamMemberFormValues) {
        startSaveTransition(async () => {
            const result = await updateTeamMemberAction(member.id, values);
            if (result.success) {
                toast({
                    title: 'Member Updated',
                    description: `The team member has been successfully updated.`,
                });
                setIsEditing(false);
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error updating member',
                    description: result.error,
                });
            }
        });
    }

    const handleDelete = () => {
        startDeleteTransition(async () => {
            const result = await deleteTeamMemberAction(member.id);
            if (result.success) {
                toast({ title: "Member Deleted" });
                router.push('/manage/team');
            } else {
                toast({ variant: 'destructive', title: "Deletion Failed", description: result.error });
            }
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        form.reset();
    };

    return (
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <CardTitle>Team Member Details</CardTitle>
                        <CardDescription>Viewing details for "{member.name}".</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                             <Button onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                                <Button type="submit" form="member-edit-form" disabled={isSaving}>
                                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                                </Button>
                            </>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isDeleting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the team member.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete'}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form id="member-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <FormField
                            control={form.control}
                            name="registered"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5"><FormLabel className="text-base">Link to Registered User?</FormLabel></div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={(c) => { field.onChange(c); setIsRegistered(c); }} disabled={!isEditing} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {isRegistered ? (
                             <FormField control={form.control} name="userId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select User</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a registered user" /></SelectTrigger></FormControl>
                                        <SelectContent>{users.map(user => (<SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>))}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        ) : (
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="text-lg font-medium">Manual Member Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} disabled={!isEditing}/></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="photoUrl" render={({ field }) => (<FormItem><FormLabel>Photo URL</FormLabel><FormControl><Input {...field} disabled={!isEditing} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-4">
                             <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Position</FormLabel><FormControl><Input {...field} disabled={!isEditing} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="about" render={({ field }) => (<FormItem><FormLabel>About</FormLabel><FormControl><Textarea {...field} disabled={!isEditing}/></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="moreDetails" render={({ field }) => (<FormItem><FormLabel>More Details</FormLabel><FormControl><Textarea {...field} disabled={!isEditing} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>

                         <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Social Media</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="socialMedia.linkedin" render={({ field }) => (<FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input {...field} disabled={!isEditing}/></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="socialMedia.twitter" render={({ field }) => (<FormItem><FormLabel>Twitter (X) URL</FormLabel><FormControl><Input {...field} disabled={!isEditing}/></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="socialMedia.facebook" render={({ field }) => (<FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input {...field} disabled={!isEditing}/></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
