
'use client';

import { useState, useEffect } from 'react';
import { getUsers } from '@/services/user-service';
import { SafeImage } from '@/components/safe-image';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, Wand2 } from 'lucide-react';
import { Section } from '@/components/home/_components/section';
import { SectionTitle } from '@/components/home/_components/section-title';
import { RecommendedProperties } from "@/components/recommended-properties";
import { UserRequirementsForm, type RequirementsFormValues } from '@/components/profile/user-requirements-form';
import { upsertRequirementAction } from '@/app/actions';
import { getRequirementByUserId } from '@/services/requirements-service';
import type { Requirement } from '@/types';

// Mock user ID
const MOCK_USER_ID = "usr-1";

function UserProfileHeader() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        async function fetchUser() {
            const users = await getUsers();
            const currentUser = users.find(u => u.id === MOCK_USER_ID) || users[0];
            setUser(currentUser);
        }
        fetchUser();
    }, []);

    if (!user) {
        return <div className="h-96" /> // or a skeleton loader
    }
    
    return (
        <div className="w-full bg-background pt-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative h-48 md:h-64 bg-secondary rounded-lg">
                    <SafeImage
                        src="https://placehold.co/1200x400.png"
                        alt="Cover photo"
                        data-ai-hint="abstract texture"
                        className="w-full h-full object-cover rounded-lg"
                        layout="fill"
                    />
                    <Button size="sm" variant="secondary" className="absolute bottom-4 right-4">
                        <Camera className="mr-2 h-4 w-4" />
                        Edit cover photo
                    </Button>
                </div>
            
                <div className="flex flex-col items-center -mt-20">
                    <div className="relative h-32 w-32 md:h-40 md:w-40 border-4 border-background rounded-full flex-shrink-0 z-10">
                         <SafeImage
                            src={user.avatarUrl || "https://placehold.co/200x200.png"}
                            alt={user.name}
                            data-ai-hint="person portrait"
                            className="rounded-full object-cover"
                            layout="fill"
                        />
                    </div>
                    <div className="text-center mt-4">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline">{user.name}</h1>
                        <p className="text-muted-foreground flex items-center justify-center gap-1">
                            <MapPin className="h-4 w-4"/>
                            New York, NY
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function RecommendedForYouSection({ requirements }: { requirements: RequirementsFormValues | null }) {
    if (!requirements) {
        return null; // Don't show recommendations if no requirements are set
    }

    return (
        <Section className="w-full py-12 bg-background">
            <SectionTitle>
                 <Wand2 className="h-7 w-7 text-primary" />
                Recommended For You
            </SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Based on your requirements, here are some properties you might love.
            </p>
            <RecommendedProperties requirements={requirements} />
        </Section>
    )
}

export default function ProfilePage() {
    const [requirements, setRequirements] = useState<RequirementsFormValues | null>(null);

    const PRESET_LOCATIONS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];

    useEffect(() => {
        async function fetchRequirements() {
            const req = await getRequirementByUserId(MOCK_USER_ID);
            if (req) {
                 setRequirements({
                    purpose: req.purpose as 'buy' | 'rent',
                    propertyTypes: req.propertyType,
                    minPrice: req.minBudget,
                    maxPrice: req.maxBudget,
                    location: req.location,
                    otherLocation: PRESET_LOCATIONS.includes(req.location) ? '' : req.location,
                 });
            }
        }
        fetchRequirements();
    }, []);
    
    const handleSaveRequirements = async (data: RequirementsFormValues) => {
        const result = await upsertRequirementAction({
            userId: MOCK_USER_ID,
            purpose: data.purpose,
            propertyType: data.propertyTypes,
            minBudget: data.minPrice,
            maxBudget: data.maxPrice,
            location: data.location === '' && data.otherLocation ? data.otherLocation : data.location,
            urgency: 'medium', // Default value
            paymentMethod: 'full-cash', // Default value
            requiredTime: 'within 3 months', // Default value
            loan: false, // Default value
        });

        if (result.success) {
            setRequirements(data);
        }
        return result;
    }

    return (
        <main className="flex-1 bg-secondary/30">
            <UserProfileHeader />
            
            <Section>
                <SectionTitle>Your Requirements</SectionTitle>
                <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                    Let us know what you're looking for so we can provide better recommendations.
                </p>
                <UserRequirementsForm 
                    initialRequirements={requirements} 
                    onSave={handleSaveRequirements} 
                />
            </Section>
            
            <RecommendedForYouSection requirements={requirements} />
        </main>
    );
}
