
import { getRequirementByUserId } from "@/services/requirements-service";
import { RecommendedProperties } from "@/components/recommended-properties";
import { Section } from "./_components/section";
import { SectionTitle } from "./_components/section-title";
import type { RequirementsFormValues } from "@/components/profile/user-requirements-form";
import { getRecentProperties } from "@/services/property-service";
import { PropertyCard } from "../property-card";

// In a real app, you would get this from the user's session.
const MOCK_USER_ID = "usr-1";

export async function CuratedForYouSection() {
    const requirements = await getRequirementByUserId(MOCK_USER_ID);

    let requirementsForClient: RequirementsFormValues | null = null;
    if (requirements) {
        const PRESET_LOCATIONS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
        requirementsForClient = {
            purpose: requirements.purpose as 'Buy' | 'Rent' || 'Buy',
            propertyType: requirements.propertyType || "House",
            minPrice: requirements.minBudget,
            maxPrice: requirements.maxBudget,
            location: requirements.location || '',
            otherLocation: PRESET_LOCATIONS.includes(requirements.location || '') ? '' : requirements.location || '',
            paymentMethod: requirements.paymentMethod || [],
            requiredTime: requirements.requiredTime || "Within 3 months",
        };
    }

    const fallbackProperties = requirementsForClient ? [] : await getRecentProperties(4);

    return (
        <Section>
            <SectionTitle href="/collections">
                Curated For You
            </SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                {requirementsForClient
                    ? "Based on your interests, our AI has curated a list of properties you might love."
                    : "Discover some of our latest properties. Set your preferences to get personalized recommendations."}
            </p>
            {requirementsForClient ? (
                <RecommendedProperties requirements={requirementsForClient} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {fallbackProperties.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>
            )}
        </Section>
    );
}
