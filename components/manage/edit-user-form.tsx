

"use client";

import { useTransition, useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateUserAction, getSavedPropertiesForUser } from '@/app/actions';
import { getUserPreferences } from '@/services/user-preference-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Loader2, Pencil, Trash2, PlusCircle, Link2, Info, CalendarDays, Clock, UserCircle, Fingerprint, Activity, Hourglass, Bookmark, BarChart, Wifi } from 'lucide-react';
import type { UpdateUserFormValues, Account, UserPreferences, Property } from '@/types';
import { UpdateUserSchema } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RelativeTime } from './relative-time';
import { ClientLink } from '@/components/client-link';
import { Skeleton } from '@/components/ui/skeleton';

interface EditUserFormProps {
    user: UpdateUserFormValues;
    account: Account;
}

const ContactFieldArray = ({ control, name, label, typeOptions, disabled }: { control: any, name: 'email' | 'phone', label: string, typeOptions: string[], disabled: boolean }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name,
    });

    return (
        <div className="space-y-4">
            <h4 className="font-medium">{label}</h4>
            {fields.map((item, index) => (
                <div key={item.id} className="flex items-end gap-2 p-2 border rounded-md bg-muted/50">
                    <FormField
                        control={control}
                        name={`${name}.${index}.value`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel className="text-xs">Value</FormLabel>
                                <FormControl>
                                    {name === 'phone' ? (
                                        <PhoneInput {...field} disabled={disabled} />
                                    ) : (
                                        <Input {...field} disabled={disabled} />
                                    )}
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`${name}.${index}.type`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {typeOptions.map(opt => <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)} disabled={disabled}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ type: 'primary', value: '' })}
                disabled={disabled}
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add {label.slice(0, -1)}
            </Button>
        </div>
    );
};

const InfoRow = ({ icon, label, children }: { icon: React.ReactNode, label: string, children: React.ReactNode }) => (
    <div className="flex items-start gap-2 text-sm">
        <div className="flex items-center gap-1 w-40 text-muted-foreground flex-shrink-0">
            {icon}
            <span>{label}</span>
        </div>
        <div className="font-medium break-all">{children}</div>
    </div>
);


export function EditUserForm({ user, account }: EditUserFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [savedProperties, setSavedProperties] = useState<Property[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        async function loadData() {
            const [prefs, saved] = await Promise.all([
                getUserPreferences(user.id),
                getSavedPropertiesForUser(user.id)
            ]);
            setPreferences(prefs);
            setSavedProperties(saved);
        }
        loadData();
    }, [user.id]);
    
    const form = useForm<UpdateUserFormValues>({
        resolver: zodResolver(UpdateUserSchema),
        defaultValues: user,
    });

    const onSubmit = (values: UpdateUserFormValues) => {
        startSaveTransition(async () => {
            const result = await updateUserAction(values);
            if (result.success) {
                toast({ title: 'User Updated', description: `Details for ${values.name || 'user'} have been saved.` });
                setIsEditing(false);
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    };
    
    const formatTimeSpent = (seconds: number) => {
        if (!seconds) return '0 minutes';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        let result = '';
        if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''} `;
        if (minutes > 0 || hours === 0) result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
        return result.trim();
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                        <CardDescription>
                            Viewing account: <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md">{user.id}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 border-t">
                        <InfoRow icon={<UserCircle className="h-4 w-4" />} label="Account Type:">
                            <span className="capitalize">{account.account_type}</span>
                        </InfoRow>
                        <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Created On:">
                           {isClient ? 
                                <span>{new Date(account.created_on).toLocaleString()} (<RelativeTime timestamp={account.created_on} />)</span> 
                                : <Skeleton className="h-4 w-48" />
                            }
                        </InfoRow>
                         <InfoRow icon={<Clock className="h-4 w-4" />} label="Last Accessed:">
                            {isClient ?
                                <span>{new Date(account.accessed_on).toLocaleString()} (<RelativeTime timestamp={account.accessed_on} />)</span>
                                : <Skeleton className="h-4 w-48" />
                            }
                        </InfoRow>
                        <InfoRow icon={<Wifi className="h-4 w-4" />} label="Created From IP:">
                            <span className="font-mono text-xs">{account.created_from_ip || 'N/A'}</span>
                        </InfoRow>
                         <InfoRow icon={<Wifi className="h-4 w-4" />} label="Last Accessed From IP:">
                            <span className="font-mono text-xs">{account.last_accessed_from_ip || 'N/A'}</span>
                        </InfoRow>
                        <InfoRow icon={<Hourglass className="h-4 w-4" />} label="Time on Platform:">
                            {formatTimeSpent(preferences?.totalTimeSpentInSeconds || 0)}
                        </InfoRow>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <CardTitle>Account Demographics</CardTitle>
                             <CardDescription>
                                The user's personal information. Click edit to make changes.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isEditing ? (
                                <Button type="button" onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                            ) : (
                                <>
                                    <Button type="button" variant="outline" onClick={() => { setIsEditing(false); form.reset(); }}>Cancel</Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                     <CardContent className="space-y-6">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={!isEditing} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} disabled={!isEditing} /></FormControl><FormMessage /></FormItem>)} />
                        <ContactFieldArray control={form.control} name="email" label="Email Addresses" typeOptions={['primary', 'work', 'other']} disabled={!isEditing} />
                        <ContactFieldArray control={form.control} name="phone" label="Phone Numbers" typeOptions={['primary', 'work', 'mobile', 'whatsapp']} disabled={!isEditing} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Activity /> Engagement</CardTitle>
                         <CardDescription>A summary of the user's activities on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                             <h4 className="font-medium text-sm mb-2">Recent Saved Properties ({savedProperties.length})</h4>
                             {savedProperties.length > 0 ? (
                                <div className="space-y-2">
                                    {savedProperties.slice(0, 10).map(prop => (
                                        <div key={prop.id} className="p-2 border rounded-md text-sm">
                                            <ClientLink href={`/manage/properties/${prop.id}/edit`} className="font-semibold hover:underline">{prop.title}</ClientLink>
                                            <p className="text-xs text-muted-foreground">{prop.location}</p>
                                        </div>
                                    ))}
                                    {savedProperties.length > 10 && (
                                         <Button variant="outline" className="w-full" asChild>
                                            <ClientLink href={`/manage/users/${user.id}/activity`}>View All Activity</ClientLink>
                                        </Button>
                                    )}
                                </div>
                             ) : (
                                <p className="text-sm text-muted-foreground">No properties saved yet.</p>
                             )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Link2 /> Account Linking</CardTitle>
                        <CardDescription>
                            Manage connections to other user profiles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Feature Coming Soon</AlertTitle>
                            <AlertDescription>
                                Functionality to link this account with other registered or guest profiles will be available in a future update.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
