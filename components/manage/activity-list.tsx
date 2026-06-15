"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';

import { addLeadActivityAction } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/logica/core/hooks/use-toast';

type Lead = {
    id: string;
    type: string;
    priority: string;
};

type Property = {
    id: string;
    title: string;
    location?: string | null;
};

type LeadActivity = {
    id: string;
    leadId: string;
    data: any;
    activityOn: string | Date;
    activityBy: string;
};

interface ActivityListProps {
    activities: LeadActivity[];
    leads?: Lead[];
    showLead?: boolean;
    leadId?: string;
    properties?: Property[];
}

const activityTypes = ['follow_up', 'visit', 'meeting', 'remarks'] as const;
const followUpMethods = ['phone call', 'whatsapp', 'email'] as const;

const leadActivitySchema = z.object({
    activityType: z.enum(activityTypes),
    activityOn: z.string().optional(),
    followUpMethod: z.enum(followUpMethods).optional(),
    propertyId: z.string().optional(),
    remarks: z.string().min(1, 'Remarks are required'),
}).superRefine((data, ctx) => {
    if (data.activityType !== 'remarks' && !data.activityOn?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['activityOn'],
            message: 'When is required.',
        });
    }

    if (data.activityType === 'follow_up' && !data.followUpMethod) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['followUpMethod'],
            message: 'Follow up method is required.',
        });
    }
});

type LeadActivityValues = z.infer<typeof leadActivitySchema>;

function formatActivityType(type: string) {
    return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFollowUpMethod(method: string) {
    if (method === 'whatsapp') return 'WhatsApp';
    return formatActivityType(method);
}

function formatLocalDateTime(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function toLocalInputValue(date: Date) {
    const pad = (num: number) => String(num).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getActivityType(data: Record<string, any>) {
    return String(data.activityType ?? data.type ?? 'remarks');
}

function getPropertyLabel(data: Record<string, any>, propertiesMap: Map<string, Property>) {
    const propertyId = data.propertyId ? String(data.propertyId) : '';
    const propertyTitle = data.propertyTitle ? String(data.propertyTitle) : '';
    if (propertyTitle) return propertyTitle;
    if (propertyId && propertiesMap.has(propertyId)) {
        const property = propertiesMap.get(propertyId)!;
        return property.location ? `${property.title} (${property.location})` : property.title;
    }
    return propertyId || '';
}

function ActivityComposer({
    leadId,
    properties,
}: {
    leadId: string;
    properties: Property[];
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const form = useForm<LeadActivityValues>({
        resolver: zodResolver(leadActivitySchema),
        defaultValues: {
            activityType: 'follow_up',
            activityOn: toLocalInputValue(new Date()),
            followUpMethod: 'phone call',
            propertyId: '__none__',
            remarks: '',
        },
    });

    const activityType = form.watch('activityType');

    useEffect(() => {
        if (!open) return;
        form.reset({
            activityType: 'follow_up',
            activityOn: toLocalInputValue(new Date()),
            followUpMethod: 'phone call',
            propertyId: '__none__',
            remarks: '',
        });
    }, [open, form]);

    const shouldShowWhen = activityType !== 'remarks';
    const shouldShowFollowUpMethod = activityType === 'follow_up';
    const shouldShowProperty = activityType === 'visit';

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);
    }

    function onSubmit(values: LeadActivityValues) {
        startTransition(async () => {
            const result = await addLeadActivityAction({
                leadId,
                activityType: values.activityType,
                activityOn: values.activityType === 'remarks' ? undefined : values.activityOn,
                followUpMethod: values.activityType === 'follow_up' ? values.followUpMethod : undefined,
                propertyId: values.activityType === 'visit' && values.propertyId && values.propertyId !== '__none__'
                    ? values.propertyId
                    : undefined,
                remarks: values.remarks,
            });

            if (result.success) {
                toast({
                    title: 'Activity added',
                    description: 'The lead activity has been logged.',
                });
                setOpen(false);
                form.reset({
                    activityType: 'follow_up',
                    activityOn: toLocalInputValue(new Date()),
                    followUpMethod: 'phone call',
                    propertyId: '__none__',
                    remarks: '',
                });
                router.refresh();
                return;
            }

            toast({
                variant: 'destructive',
                title: 'Failed to add activity',
                description: result.error ?? 'Unable to save the activity.',
            });
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4" />
                    Add activity
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add activity</DialogTitle>
                    <DialogDescription>
                        Choose the activity type and fill in the follow-up details.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="activityType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Activity type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an activity type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="follow_up">Follow up</SelectItem>
                                            <SelectItem value="visit">Visit</SelectItem>
                                            <SelectItem value="meeting">Meeting</SelectItem>
                                            <SelectItem value="remarks">Remarks</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {shouldShowWhen && (
                            <FormField
                                control={form.control}
                                name="activityOn"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>When</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {shouldShowFollowUpMethod && (
                            <FormField
                                control={form.control}
                                name="followUpMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Follow up method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="phone call">Phone call</SelectItem>
                                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {shouldShowProperty && (
                            <FormField
                                control={form.control}
                                name="propertyId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Property (optional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choose a property" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__none__">No property</SelectItem>
                                                {properties.map((property) => (
                                                    <SelectItem key={property.id} value={property.id}>
                                                        {property.location ? `${property.title} (${property.location})` : property.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remarks</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Add remarks"
                                            className="min-h-[110px]"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Save activity
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function ActivityList({ activities, leads = [], showLead = false, leadId, properties = [] }: ActivityListProps) {
    const leadMap = useMemo(() => Object.fromEntries(leads.map((lead) => [lead.id, lead])), [leads]);
    const propertiesMap = useMemo(() => new Map(properties.map((property) => [property.id, property])), [properties]);

    if (activities.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">Activity history</h3>
                        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                    </div>
                    {leadId ? <ActivityComposer leadId={leadId} properties={properties} /> : null}
                </div>
                <p className="text-sm text-muted-foreground py-12 text-center rounded-lg border">
                    No activity recorded yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold">Activity history</h3>
                    <p className="text-sm text-muted-foreground">
                        {activities.length} event{activities.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {leadId ? <ActivityComposer leadId={leadId} properties={properties} /> : null}
            </div>

            <div className="space-y-3">
                {activities.map((activity) => {
                    const data = (activity.data ?? {}) as Record<string, any>;
                    const activityType = getActivityType(data);
                    const method = data.followUpMethod ? formatFollowUpMethod(String(data.followUpMethod)) : '';
                    const propertyLabel = getPropertyLabel(data, propertiesMap);
                    const remarks = String(data.remarks ?? '').trim();
                    const lead = leadMap[activity.leadId];

                    return (
                        <div key={activity.id} className="rounded-lg border bg-card px-5 py-4 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold">{formatActivityType(activityType)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatLocalDateTime(activity.activityOn)} · by {activity.activityBy}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="capitalize">
                                            {formatActivityType(activityType)}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 text-sm">
                                        {method && (
                                            <p>
                                                <span className="text-muted-foreground">Follow up method: </span>
                                                <span className="font-medium">{method}</span>
                                            </p>
                                        )}
                                        {propertyLabel && (
                                            <p>
                                                <span className="text-muted-foreground">Property: </span>
                                                <span className="font-medium">{propertyLabel}</span>
                                            </p>
                                        )}
                                        <p className="whitespace-pre-wrap text-muted-foreground">
                                            {remarks || 'No remarks provided.'}
                                        </p>
                                    </div>

                                    {showLead && lead && (
                                        <div className="flex items-center gap-1">
                                            <Badge variant="outline" className="text-[11px] py-0">{lead.type}</Badge>
                                            <Badge variant="outline" className="text-[11px] py-0 capitalize">{lead.priority.toLowerCase()}</Badge>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
