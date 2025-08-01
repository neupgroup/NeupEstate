
"use client";

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { CreateTeamMemberSchema, type CreateTeamMemberFormValues, type User } from '@/types';
import { createTeamMemberAction } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export function CreateTeamMemberForm({ users }: { users: User[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isRegistered, setIsRegistered] = useState(false);

    const form = useForm<CreateTeamMemberFormValues>({
        resolver: zodResolver(CreateTeamMemberSchema),
        defaultValues: {
            registered: false,
            name: '',
            position: '',
            photoUrl: '',
            about: '',
            moreDetails: '',
            socialMedia: {
                linkedin: '',
                twitter: '',
                facebook: '',
            },
        },
    });

    useEffect(() => {
        form.reset({
            registered: isRegistered,
            name: '',
            position: '',
            photoUrl: '',
            about: '',
            moreDetails: '',
            socialMedia: {
                linkedin: '',
                twitter: '',
                facebook: '',
            },
        });
    }, [isRegistered, form]);

    async function onSubmit(values: CreateTeamMemberFormValues) {
        startTransition(async () => {
            const result = await createTeamMemberAction(values);
            if (result.success) {
                toast({
                    title: 'Team Member Added',
                    description: `The team member has been successfully added.`,
                });
                router.push('/manage/team');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error adding member',
                    description: result.error,
                });
            }
        });
    }

    return (
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle>Add New Team Member</CardTitle>
                <CardDescription>Fill out the form below to add a new person to your team.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="registered"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Link to Registered User?</FormLabel>
                                        <FormDescription>
                                            Link this profile to an existing user in the system.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                setIsRegistered(checked);
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {isRegistered ? (
                            <FormField
                                control={form.control}
                                name="userId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select User</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a registered user to link" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {users.map(user => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.name} ({user.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="text-lg font-medium">Manual Member Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="photoUrl" render={({ field }) => (<FormItem><FormLabel>Photo URL (Optional)</FormLabel><FormControl><Input placeholder="https://example.com/photo.png" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-4">
                             <FormField control={form.control} name="position" render={({ field }) => (
                                <FormItem><FormLabel>Position / Role</FormLabel><FormControl><Input placeholder="e.g., Lead Agent" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="about" render={({ field }) => (
                                <FormItem><FormLabel>About</FormLabel><FormControl><Textarea placeholder="A short bio about the team member..." {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="moreDetails" render={({ field }) => (
                                <FormItem><FormLabel>More Details (Optional)</FormLabel><FormControl><Textarea placeholder="Additional details, expertise, etc." {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>

                         <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Social Media (Optional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="socialMedia.linkedin" render={({ field }) => (
                                    <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="socialMedia.twitter" render={({ field }) => (
                                    <FormItem><FormLabel>Twitter (X) URL</FormLabel><FormControl><Input placeholder="https://x.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="socialMedia.facebook" render={({ field }) => (
                                    <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>

                        <Button type="submit" disabled={isPending}>
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Team Member'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
