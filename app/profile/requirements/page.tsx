
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserRequirementsForm, type RequirementsFormValues } from '@/components/profile/user-requirements-form';
import { upsertRequirementAction } from '@/services/engagement';
import { getRequirementById } from '@/services/requirements-service';
import type { Requirement } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getClientAccountId } from '@/services/account/get-account-id';

const PRESET_LOCATIONS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];

function RequirementsFormSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {[...Array(6)].map((_, i) => (
                         <div key={i} className="flex items-center space-x-2">
                             <Skeleton className="h-4 w-4" />
                             <Skeleton className="h-4 w-20" />
                         </div>
                    ))}
                 </div>
            </div>
             <div className="space-y-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-4">
                <Skeleton className="h-5 w-20" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </div>
    );
}

export default function RequirementsPage() {
    const searchParams = useSearchParams();
    const requirementId = searchParams.get('id');
    const [initialRequirements, setInitialRequirements] = useState<RequirementsFormValues | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
      const id = getClientAccountId();
      setUserId(id);

      async function fetchRequirements() {
          if (requirementId) {
              const req = await getRequirementById(requirementId);
              if (req) {
                   setInitialRequirements({
                      purpose: req.purpose as 'Buy' | 'Rent',
                      propertyType: req.propertyType?.[0] as any, // Take the first type for single selection
                      minPrice: req.minBudget,
                      maxPrice: req.maxBudget,
                      location: PRESET_LOCATIONS.includes(req.location || '') ? req.location! : '',
                      otherLocation: PRESET_LOCATIONS.includes(req.location || '') ? '' : req.location!,
                      paymentMethod: req.paymentMethod as any, // Cast
                      requiredTime: req.requiredTime as any, // Cast
                   });
              }
          }
          setIsLoading(false);
      }
      fetchRequirements();
    }, [requirementId]);
    
    const handleSaveRequirements = async (data: any) => {
      if (!userId) {
        return { success: false, error: "No user session found. Please refresh the page." };
      }
      return upsertRequirementAction({
          ...data,
          userId: userId,
          location: data.location === '' ? data.otherLocation : data.location,
      }, requirementId || undefined);
    }

    const title = requirementId ? 'Edit Your Requirements' : 'Create New Requirements';
    const description = requirementId 
        ? "Update your preferences below. Your changes will be saved automatically."
        : "Let us know what you're looking for so we can provide better recommendations.";

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <RequirementsFormSkeleton />
                    ) : (
                        <UserRequirementsForm 
                            initialRequirements={initialRequirements} 
                            onSave={handleSaveRequirements} 
                        />
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
