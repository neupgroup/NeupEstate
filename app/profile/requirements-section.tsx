'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
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
    );
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
                  <Plus className="mr-2 h-4 w-4" />
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

  const firstReq = requirements[0];
  const PRESET_LOCATIONS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];

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
        <RecommendedProperties requirements={requirementsForClient} />
      </SectionTitle>
      <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
        Based on your primary requirements, here are some properties you might love.
      </p>
      <RecommendedProperties requirements={requirementsForClient} />
    </Section>
  );
}

type RequirementsSectionProps = {
  accountId: string;
};

export function RequirementsSection({ accountId }: RequirementsSectionProps) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);

  useEffect(() => {
    async function fetchRequirements() {
      setIsLoadingRequirements(true);
      const reqs = await getRequirementByUserId(accountId);
      setRequirements(reqs || []);
      setIsLoadingRequirements(false);
    }
    fetchRequirements();
  }, [accountId]);

  return (
    <main className="flex-1 bg-secondary/30">
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

      {/* StartWithNeupEstate removed from profile view per design */}
    </main>
  );
}
