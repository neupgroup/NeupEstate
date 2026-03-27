"use client";

import { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CreatePropertyFormValues, User } from "@/types";
import { Button } from "@/components/ui/button";
import { BasicDetailsSection } from "@/components/manage/property-form-sections/basic-details-section";
import { PropertySpecificsSection } from "@/components/manage/property-form-sections/property-specifics-section";
import { RoomsAndSpaceSection } from "@/components/manage/property-form-sections/rooms-and-space-section";
import { FeaturesAmenitiesSection } from "@/components/manage/property-form-sections/features-amenities-section";
import { PricingDetailsSection } from "@/components/manage/property-form-sections/pricing-details-section";
import { LocationDetailsSection } from "@/components/manage/property-form-sections/location-details-section";
import { OwnerInfoSection } from "@/components/manage/property-form-sections/owner-info-section";
import { PropertyPhotosSection } from "@/components/manage/property-form-sections/property-photos-section";
import { PropertyDocumentsSection } from "@/components/manage/property-form-sections/property-documents-section";
import { TitleDescriptionSection } from "@/components/manage/property-form-sections/title-description-section";
import { SeoSection } from "@/components/manage/property-form-sections/seo-section";

type PropertyFormStep = {
    id: string;
    title: string;
    fields: Array<keyof CreatePropertyFormValues | string>;
    render: () => JSX.Element | null;
};

interface ProgressivePropertySectionsProps {
    form: UseFormReturn<CreatePropertyFormValues>;
    users: User[];
    isEditForm: boolean;
    isSubmitting: boolean;
    submitLabel: string;
}

export function ProgressivePropertySections({
    form,
    users,
    isEditForm,
    isSubmitting,
    submitLabel,
}: ProgressivePropertySectionsProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const category = form.watch("category");

    const steps = useMemo<PropertyFormStep[]>(() => {
        const sections: PropertyFormStep[] = [
            {
                id: "basics",
                title: "Property Basics",
                fields: ["purposes", "category", "type"],
                render: () => <BasicDetailsSection control={form.control} />,
            },
            {
                id: "specifics",
                title: "Property Specifics",
                fields: ["area", "areaUnit", "buildStart", "buildCompleted", "facing", "floors", "onFloor", "landDetails", "plots", "apartmentUnits"],
                render: () => <PropertySpecificsSection control={form.control} category={category} />,
            },
            ...(category === "Land"
                ? []
                : [
                    {
                        id: "rooms",
                        title: "Rooms & Space",
                        fields: ["bedrooms", "bathrooms", "kitchens", "diningRooms", "livingRooms", "carParkingSpots", "bikeParkingSpots"],
                        render: () => <RoomsAndSpaceSection control={form.control} category={category} />,
                    } satisfies PropertyFormStep,
                ]),
            {
                id: "features",
                title: "Features and Amenities",
                fields: ["amenities"],
                render: () => <FeaturesAmenitiesSection control={form.control} />,
            },
            {
                id: "pricing",
                title: "Pricing Details",
                fields: ["pricing"],
                render: () => <PricingDetailsSection control={form.control} />,
            },
            {
                id: "location",
                title: "Location Details",
                fields: ["structuredLocation"],
                render: () => <LocationDetailsSection control={form.control} />,
            },
            {
                id: "owners",
                title: "Owner Information",
                fields: ["owners"],
                render: () => <OwnerInfoSection control={form.control} users={users} formErrors={form.formState.errors} />,
            },
            {
                id: "photos",
                title: "Property Photos",
                fields: ["images"],
                render: () => <PropertyPhotosSection control={form.control} />,
            },
            {
                id: "documents",
                title: "Property Documents",
                fields: ["documents"],
                render: () => <PropertyDocumentsSection control={form.control} />,
            },
            {
                id: "copy",
                title: "Title & Description",
                fields: ["title", "description"],
                render: () => <TitleDescriptionSection control={form.control} />,
            },
            {
                id: "seo",
                title: "SEO & Metadata",
                fields: isEditForm ? ["slug", "metaTitle", "metaDescription", "metaTags"] : ["metaTitle", "metaDescription", "metaTags"],
                render: () => <SeoSection control={form.control} isEditForm={isEditForm} />,
            },
        ];

        return sections;
    }, [category, form.control, form.formState.errors, isEditForm, users]);

    useEffect(() => {
        if (currentStepIndex >= steps.length) {
            setCurrentStepIndex(Math.max(steps.length - 1, 0));
        }
    }, [currentStepIndex, steps.length]);

    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;

    async function handleContinue() {
        const isValid = await form.trigger(currentStep.fields as any, { shouldFocus: true });
        if (!isValid) return;
        setCurrentStepIndex((index) => Math.min(index + 1, steps.length - 1));
    }

    function handleBack() {
        setCurrentStepIndex((index) => Math.max(index - 1, 0));
    }

    return (
        <div className="space-y-6">
            {currentStep?.render()}

            <div className="flex flex-wrap items-center gap-3">
                {isLastStep ? (
                    <Button type="submit" disabled={isSubmitting}>
                        {submitLabel}
                    </Button>
                ) : (
                    <Button type="button" onClick={handleContinue}>
                        Continue
                    </Button>
                )}

                {currentStepIndex > 0 && (
                    <Button type="button" variant="outline" onClick={handleBack}>
                        Back
                    </Button>
                )}
            </div>
        </div>
    );
}
