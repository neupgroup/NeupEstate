
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { CreatePropertySchema, type CreatePropertyFormValues, type User } from '@/types';
import { createPropertyAction, getCurrentAccountId } from '@/app/actions';

import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/logica/core/hooks/use-toast';
import { getUsers } from '@/services/user-service';
import { getAccounts } from '@/services/account-service';
import { getAgencyAgentMapsByAgent } from '@/services/agency-agent-map-service';
import { useAgencyCustomization } from '@/logica/core/hooks/use-agency-customization';
import type { Account, AgencyAgentMap } from '@/types';
import { cn } from '@/logica/core/utils';

import { ProgressivePropertySections } from '@/components/manage/progressive-property-sections';

export default function CreatePropertyPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [users, setUsers] = React.useState<User[]>([]);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [agencyAccounts, setAgencyAccounts] = useState<Account[]>([]);
    const [agencyLinks, setAgencyLinks] = useState<AgencyAgentMap[]>([]);
    const [postingAgencyId, setPostingAgencyId] = useState<string | null>(null);

    useEffect(() => {
        async function loadContext() {
            const [userList, currentId, accountList] = await Promise.all([
                getUsers(),
                getCurrentAccountId(),
                getAccounts(),
            ]);

            setUsers(userList);
            setAccountId(currentId);

            if (!currentId) {
                setAgencyAccounts([]);
                setAgencyLinks([]);
                setPostingAgencyId(null);
                return;
            }

            const links = await getAgencyAgentMapsByAgent(currentId);
            const acceptedLinks = links.filter((link) => link.status === 'accepted');
            const agencies = accountList.filter((account) => account.account_type === 'brand');

            setAgencyLinks(acceptedLinks);
            setAgencyAccounts(agencies);
            setPostingAgencyId(
                acceptedLinks[0]?.agencyId ??
                null,
            );
        }

        loadContext();
    }, []);

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

    const form = useForm<CreatePropertyFormValues>({
        resolver: zodResolver(CreatePropertySchema),
        defaultValues: {
            title: '',
            description: '',
            purposes: [],
            area: undefined,
            bedrooms: 1,
            bathrooms: 1,
            areaUnit: 'sqft',
            kitchens: 1,
            diningRooms: 0,
            livingRooms: 1,
            carParkingSpots: 0,
            bikeParkingSpots: 0,
            amenities: '',
            images: [''],
            listingAgent: '',
            isOwnerListing: false,
            isPrivate: false,
            showMap: true,
            showOwnerInformation: true,
            floors: undefined,
            roadAccess: undefined,
            landDetails: {},
            plots: [],
            apartmentDetails: {},
            apartmentUnits: [],
            structuredLocation: {},
            pricing: {
                listed: 0,
                negotiable: false,
            },
            roadAccessDetails: {},
            distancing: {},
            earnings: {},
            owners: [],
            documents: [],
        },
    });

    async function onSubmit(values: CreatePropertyFormValues) {
        startTransition(async () => {
            const result = await createPropertyAction(values, postingAgencyId);
            if (result.success) {
                toast({
                    title: 'Review Requested',
                    description: `The property "${values.title}" has been saved for approval.`,
                });
                router.push('/manage/properties');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error creating property',
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
        void fromIndex;
        void toIndex;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onSubmitInvalid)} className="space-y-6">
                    {accountId && agencyLinks.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Post To Agency</CardTitle>
                                <CardDescription>
                                    {agencyLinks.length > 1
                                        ? 'Choose which linked agency should receive this property.'
                                        : 'This agent has one linked agency. It will be used by default.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                    {agencyAccounts
                                        .filter((account) => agencyLinks.some((link) => link.agencyId === account.id))
                                        .map((account) => {
                                            const selected = postingAgencyId === account.id;
                                            return (
                                                <button
                                                    key={account.id}
                                                    type="button"
                                                    onClick={() => setPostingAgencyId(account.id)}
                                                    className={cn(
                                                        'rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5',
                                                        selected ? 'border-primary bg-primary/10' : 'border-border bg-background',
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">{account.display_name || account.id}</p>
                                                            <p className="truncate text-xs text-muted-foreground">{account.id}</p>
                                                        </div>
                                                        {selected && <Badge>Selected</Badge>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                                {agencyLinks.length > 1 && !postingAgencyId && (
                                    <p className="text-sm text-destructive">Select an agency before creating the property.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    <ProgressivePropertySections
                        form={form}
                        users={users}
                        isEditForm={false}
                        isSubmitting={isPending}
                        submitLabel={isPending ? 'Creating...' : 'Create Property'}
                        agencyRule={agencyRule}
                        onSectionAdvance={handleSectionAdvance}
                    />
                </form>
            </Form>
        </div>
    );
}
