
"use client";

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { CreateAgentSchema, type CreateAgentFormValues, type User } from '@/types';
import { createAgentAction } from '@/app/actions';
import { getUsers } from '@/services/user-service';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function CreateAgentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [users, setUsers] = useState<User[]>([]);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        async function fetchUsers() {
            const userList = await getUsers();
            setUsers(userList);
        }
        fetchUsers();
    }, []);

    const form = useForm<CreateAgentFormValues>({
        resolver: zodResolver(CreateAgentSchema),
        defaultValues: {
            registered: false,
            location: '',
            name: '',
            email: '',
            phone: '',
            userId: undefined,
            photoUrl: '',
            specializations: '',
        },
    });

    // When the switch is toggled, reset the form values
    useEffect(() => {
        form.reset({
            registered: isRegistered as any,
            location: '',
            name: '',
            email: '',
            phone: '',
            userId: undefined,
            photoUrl: '',
            specializations: '',
        });
    }, [isRegistered, form]);

    async function onSubmit(values: CreateAgentFormValues) {
        startTransition(async () => {
            const result = await createAgentAction(values);
            if (result.success) {
                toast({
                    title: 'Agent Created',
                    description: `The agent has been successfully created.`,
                });
                router.push('/manage/agents');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error creating agent',
                    description: result.error,
                });
            }
        });
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Create New Agent</h2>
                <p className="text-sm text-muted-foreground">Fill out the form below to add a new agent.</p>
            </div>
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
                                        Link this agent profile to an existing user in the system.
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
                                                    {user.name} ({Array.isArray(user.email) ? user.email[0]?.value : user.email})
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
                                        <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl><Input type="email" placeholder="e.g., jane.doe@example.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number (Optional)</FormLabel>
                                        <FormControl><Input placeholder="e.g., (123) 456-7890" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                    <FormField control={form.control} name="photoUrl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Photo URL (Optional)</FormLabel>
                                        <FormControl><Input placeholder="https://example.com/agent-photo.png" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </div>
                    )}
                    
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Agent Location</FormLabel>
                            <FormControl><Input placeholder="e.g., New York, NY" {...field} /></FormControl>
                            <FormDescription>This is the primary location where the agent operates.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <FormField control={form.control} name="specializations" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Specializations (Market Types)</FormLabel>
                            <FormControl><Input placeholder="e.g., Land Consultant, Industrial Estate" {...field} /></FormControl>
                            <FormDescription>Enter comma-separated values for the agent's specializations.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <Button type="submit" disabled={isPending}>
                        {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Agent'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
