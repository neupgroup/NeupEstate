
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { UpdateAgentSchema, type Agent, type UpdateAgentFormValues, type User } from '@/types';
import { updateAgentAction, deleteAgentAction } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Pencil } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';

interface EditAgentFormProps {
    agent: Agent;
    users: User[];
}

export function EditAgentForm({ agent, users }: EditAgentFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [isRegistered, setIsRegistered] = useState(agent.registered);

    const form = useForm<UpdateAgentFormValues>({
        resolver: zodResolver(UpdateAgentSchema),
        defaultValues: {
            registered: agent.registered,
            location: agent.location || '',
            userId: agent.userId || undefined,
            name: agent.name || '',
            email: agent.contact.email || '',
            phone: agent.contact.phone || '',
            about: agent.about || '',
            photoUrl: agent.photoUrl || '',
            specializations: agent.specializations?.join(', ') || '',
        },
    });

    // When the switch is toggled, reset the form values
    useEffect(() => {
        if (isEditing) {
            form.reset({
                registered: isRegistered,
                location: agent.location,
                about: agent.about,
                userId: isRegistered ? agent.userId : undefined,
                name: isRegistered ? '' : agent.name,
                email: isRegistered ? '' : agent.contact.email,
                phone: isRegistered ? '' : agent.contact.phone,
                photoUrl: isRegistered ? '' : agent.photoUrl,
                specializations: agent.specializations?.join(', ') || '',
            });
        }
    }, [isRegistered, isEditing, agent, form]);

    async function onSubmit(values: UpdateAgentFormValues) {
        startSaveTransition(async () => {
            const result = await updateAgentAction(agent.id, values);
            if (result.success) {
                toast({
                    title: 'Agent Updated',
                    description: `The agent has been successfully updated.`,
                });
                setIsEditing(false);
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error updating agent',
                    description: result.error,
                });
            }
        });
    }

    const handleDelete = () => {
        startDeleteTransition(async () => {
            const result = await deleteAgentAction(agent.id);
            if (result.success) {
                toast({
                    title: "Agent Deleted",
                    description: `The agent has been permanently deleted.`,
                });
                router.push('/manage/agents');
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
            registered: agent.registered,
            location: agent.location || '',
            userId: agent.userId || undefined,
            name: agent.name || '',
            email: agent.contact.email || '',
            phone: agent.contact.phone || '',
            about: agent.about || '',
            photoUrl: agent.photoUrl || '',
            specializations: agent.specializations?.join(', ') || '',
        });
    };

    return (
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <CardTitle>Agent Details</CardTitle>
                        <CardDescription>Viewing details for agent "{agent.name}".</CardDescription>
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
                                <Button type="submit" form="agent-edit-form" disabled={isSaving}>
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
                                    This action cannot be undone. This will permanently delete the agent.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete agent'}
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form id="agent-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <FormField
                            control={form.control}
                            name="registered"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Link to Registered User?</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                setIsRegistered(checked);
                                            }}
                                            disabled={!isEditing}
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a registered user to link" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {users.map(user => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.name} ({user.email?.[0]?.value})
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
                                <h3 className="text-lg font-medium">Manual Agent Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl><Input placeholder="e.g., Jane Doe" {...field} disabled={!isEditing} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl><Input type="email" placeholder="e.g., jane.doe@example.com" {...field} disabled={!isEditing} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                     <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number (Optional)</FormLabel>
                                            <FormControl><Input placeholder="e.g., (123) 456-7890" {...field} disabled={!isEditing} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="photoUrl" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Photo URL (Optional)</FormLabel>
                                            <FormControl><Input placeholder="https://example.com/agent-photo.png" {...field} disabled={!isEditing} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>
                        )}
                        
                        <FormField control={form.control} name="location" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Agent Location</FormLabel>
                                <FormControl><Input placeholder="e.g., New York, NY" {...field} disabled={!isEditing} /></FormControl>
                                <FormDescription>This is the primary location where the agent operates.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>

                         <FormField control={form.control} name="about" render={({ field }) => (
                            <FormItem>
                                <FormLabel>About Agent</FormLabel>
                                <FormControl><Textarea placeholder="A brief bio about the agent..." {...field} disabled={!isEditing} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="specializations" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specializations (Market Types)</FormLabel>
                                <FormControl><Input placeholder="e.g., Land Consultant, Industrial Estate" {...field} disabled={!isEditing} /></FormControl>
                                <FormDescription>Enter comma-separated values for the agent's specializations.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}/>

                    </form>
                </Form>

                {agent.specializations && agent.specializations.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                        <h3 className="text-lg font-medium mb-2">Market Specializations</h3>
                        <div className="flex flex-wrap gap-2">
                            {agent.specializations.map(spec => (
                                <Badge key={spec} variant="secondary">{spec}</Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
