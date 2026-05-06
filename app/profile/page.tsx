
'use client';

import { useState, useEffect } from 'react';
import { SafeImage } from '@/components/safe-image';
import { Button } from '@/components/ui/button';
import { Edit2, MapPin, Wand2, Plus, AlertCircle, Camera, BadgeCheck } from 'lucide-react';
import { Section } from '@/components/home/_components/section';
import { SectionTitle } from '@/components/home/_components/section-title';
import { RecommendedProperties } from "@/components/recommended-properties";
import { getRequirementByUserId } from '@/services/requirements-service';
import type { Requirement } from '@/types';
import type { RequirementsFormValues } from '@/components/profile/user-requirements-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StartWithNeupEstate } from '@/components/home/start-with-neupestate';
import { getClientAccountId } from '@/services/account/get-account-id';
import { useNeupUser, getInitials } from '@/lib/neup-user-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getActiveAccount } from '@/services/account/getAccount';

function readCookieClient(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  for (let c of document.cookie.split(';')) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}


function UserProfileHeader() {
    const user = useNeupUser();
    // Read the two IDs separately so we can show the right one
    const [aid, setAid] = useState<string | null>(null);
    const [tempId, setTempId] = useState<string | null>(null);

    useEffect(() => {
        // Prefer aid from auth_accounts (def === 1)
        const active = getActiveAccount(readCookieClient('auth_accounts'));
        if (active?.aid) {
            setAid(active.aid);
        } else {
            setTempId(readCookieClient('temp_account_id'));
        }
    }, []);

    if (user === undefined) {
        // Still loading — show skeleton
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative h-48 bg-secondary rounded-lg">
                    <div className="absolute bottom-4 left-4 z-20 flex items-end gap-4">
                        <Skeleton className="h-24 w-24 md:h-32 md:w-32 border-4 border-background rounded-lg flex-shrink-0" />
                        <div className="pb-2 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const displayName = user?.displayName ?? 'Guest User';
    const displayImage = user?.displayImage ?? null;
    // neupId from whoami takes priority; fall back to aid, then temp
    const handleLine = user?.neupId
        ? `@${user.neupId}`
        : aid
        ? `@${aid}`
        : tempId
        ? `guest:${tempId}`
        : null;
    const isVerified = user?.verified ?? false;

    return (
        <div className="w-full bg-background pt-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative h-48 bg-slate-200 rounded-lg">
                    <div className="w-full h-full object-cover rounded-lg absolute inset-0 z-0 bg-slate-200" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg z-10" />
                    <div className="absolute bottom-4 left-4 z-20 flex items-end gap-4">
                        <div className="relative h-24 w-24 md:h-32 md:w-32 border-4 border-background rounded-lg flex-shrink-0 overflow-hidden bg-secondary">
                            <Avatar className="h-full w-full rounded-lg">
                                <AvatarImage
                                    src={displayImage ?? undefined}
                                    alt={displayName}
                                    className="object-cover"
                                />
                                <AvatarFallback className="rounded-lg text-2xl font-bold">
                                    {getInitials(displayName)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="pb-2">
                            {handleLine && (
                                <p className="text-xs font-mono text-white/70">
                                    {handleLine}
                                </p>
                            )}
                            <h1 className="text-2xl md:text-3xl font-bold font-headline text-white shadow-sm flex items-center gap-2">
                                {displayName}
                                {isVerified && (
                                    <BadgeCheck className="h-6 w-6 text-primary" />
                                )}
                            </h1>
                            {user?.accountType && (
                                <p className="text-gray-200 text-sm flex items-center gap-1 capitalize">
                                    <MapPin className="h-4 w-4" />
                                    {user.accountType} account
                                </p>
                            )}
                        </div>
                    </div>
                    <Button size="sm" variant="secondary" className="absolute top-4 right-4 z-20" disabled>
                        <Camera className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ViewRequirements({ requirements, isLoading }: { requirements: Requirement[], isLoading: boolean }) {
     if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }
    
     if (!requirements || requirements.length === 0) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Preferences Set</AlertTitle>
                <AlertDescription>
                   You have not set any property preferences yet. Add your requirements to get personalized recommendations.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-4">
            {requirements.map((req, index) => (
                <Card key={req.id}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Requirement Profile #{index + 1}</CardTitle>
                             <ClientLink href={`/profile/requirements?id=${req.id}`}>
                                <Button variant="outline" size="sm">
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                            </ClientLink>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                            <div><b>Looking to:</b> <span className="capitalize">{req.purpose}</span></div>
                            <div><b>Property Type:</b> <span className="capitalize">{Array.isArray(req.propertyType) ? req.propertyType.join(', ') : req.propertyType}</span></div>
                            <div><b>Location:</b> {req.location}</div>
                            <div><b>Budget:</b> ${req.minBudget?.toLocaleString() || 'Any'} - ${req.maxBudget?.toLocaleString() || 'Any'}</div>
                             <div><b>Urgency:</b> <span className="capitalize">{req.requiredTime}</span></div>
                             <div><b>Payment:</b> {Array.isArray(req.paymentMethod) ? req.paymentMethod.join(', ') : 'N/A'}</div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function RecommendedForYouSection({ requirements }: { requirements: Requirement[] | null }) {
    if (!requirements || requirements.length === 0) {
        return null;
    }

    // Use the first set of requirements for recommendations on the profile page
    const firstReq = requirements[0];
    const PRESET_LOCATIONS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
    
    // Ensure propertyType is handled as a single value and wrapped in an array for the search
    const propertyTypesArray = firstReq.propertyType ? (Array.isArray(firstReq.propertyType) ? firstReq.propertyType : [firstReq.propertyType]) : [];
    
    const requirementsForClient: RequirementsFormValues = {
        purpose: (firstReq.purpose === 'Sale' ? 'Buy' : 'Rent') as 'Buy' | 'Rent',
        propertyType: propertyTypesArray[0] as any,
        minPrice: firstReq.minBudget,
        maxPrice: firstReq.maxBudget,
        location: PRESET_LOCATIONS.includes(firstReq.location || '') ? firstReq.location! : '',
        otherLocation: PRESET_LOCATIONS.includes(firstReq.location || '') ? '' : (firstReq.location || ''),
        paymentMethod: firstReq.paymentMethod as any,
        requiredTime: firstReq.requiredTime as any,
    };

    return (
        <Section className="w-full py-12 bg-background">
            <SectionTitle>
                 <Wand2 className="h-7 w-7 text-primary" />
                Recommended For You (Based on Profile #1)
            </SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Based on your primary requirements, here are some properties you might love.
            </p>
            <RecommendedProperties requirements={requirementsForClient} />
        </Section>
    )
}

export default function ProfilePage() {
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const id = getClientAccountId();
        setUserId(id);

        async function fetchRequirements() {
            if (!id) {
                setIsLoadingRequirements(false);
                return;
            }
            setIsLoadingRequirements(true);
            const reqs = await getRequirementByUserId(id);
            setRequirements(reqs || []);
            setIsLoadingRequirements(false);
        }
        fetchRequirements();
    }, []);

    return (
        <main className="flex-1 bg-secondary/30">
            <UserProfileHeader />
            
            <Section>
                <div className="flex justify-between items-center">
                    <div>
                        <SectionTitle>Your Requirements</SectionTitle>
                        <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                            Let us know what you're looking for so we can provide better recommendations.
                        </p>
                    </div>
                     <ClientLink href="/profile/requirements">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Requirement
                        </Button>
                    </ClientLink>
                </div>
                <ViewRequirements requirements={requirements} isLoading={isLoadingRequirements} />
            </Section>
            
            <RecommendedForYouSection requirements={requirements} />

            <StartWithNeupEstate />
        </main>
    );
}
