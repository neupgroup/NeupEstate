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
    description: string;
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
    const [visibleCount, setVisibleCount] = useState(1);
    const category = form.watch("category");

    const steps = useMemo<PropertyFormStep[]>(() => {
        const sections: PropertyFormStep[] = [
            {
                id: "basics",
                title: "Basic Information",
                description: "Set the listing purpose, property type, and nature.",
                fields: ["purposes", "category", "type"],
                render: () => <BasicDetailsSection control={form.control} />,
            },
            {
                id: "specifics",
                title: "Property Specifics",
                description: "Enter the size, age, floors, and structural details.",
                fields: ["area", "areaUnit", "buildStart", "buildCompleted", "facing", "floors", "onFloor", "landDetails", "plots", "apartmentUnits"],
                render: () => <PropertySpecificsSection control={form.control} category={category} />,
            },
            ...(category === "Land"
                ? []
                : [
                    {
                        id: "rooms",
                        title: "Rooms & Space",
                        description: "Specify the number of rooms, parking, and other spaces.",
                        fields: ["bedrooms", "bathrooms", "kitchens", "diningRooms", "livingRooms", "carParkingSpots", "bikeParkingSpots"],
                        render: () => <RoomsAndSpaceSection control={form.control} category={category} />,
                    } satisfies PropertyFormStep,
                ]),
            {
                id: "features",
                title: "Features & Amenities",
                description: "List the key features and amenities available at the property.",
                fields: ["amenities"],
                render: () => <FeaturesAmenitiesSection control={form.control} />,
            },
            {
                id: "pricing",
                title: "Pricing Details",
                description: "Set the listed price, payment basis, and negotiability.",
                fields: ["pricing"],
                render: () => <PricingDetailsSection control={form.control} />,
            },
            {
                id: "location",
                title: "Location Details",
                description: "Provide the address, geo-coordinates, and nearby landmarks.",
                fields: ["structuredLocation"],
                render: () => <LocationDetailsSection control={form.control} />,
            },
            {
                id: "owners",
                title: "Owner Information",
                description: "Add the owner or authorized person's contact details.",
                fields: ["owners"],
                render: () => <OwnerInfoSection control={form.control} users={users} formErrors={form.formState.errors} />,
            },
            {
                id: "photos",
                title: "Property Photos",
                description: "Upload photos that best represent the property.",
                fields: ["images"],
                render: () => <PropertyPhotosSection control={form.control} />,
            },
            {
                id: "documents",
                title: "Property Documents",
                description: "Attach ownership documents, blueprints, or legal papers.",
                fields: ["documents"],
                render: () => <PropertyDocumentsSection control={form.control} />,
            },
            {
                id: "copy",
                title: "Title & Description",
                description: "Write a compelling title and description for the listing.",
                fields: ["title", "description"],
                render: () => <TitleDescriptionSection control={form.control} />,
            },
            {
                id: "seo",
                title: "SEO & Metadata",
                description: "Optimise the listing for search engines with meta tags and slug.",
                fields: isEditForm ? ["slug", "metaTitle", "metaDescription", "metaTags"] : ["metaTitle", "metaDescription", "metaTags"],
                render: () => <SeoSection control={form.control} isEditForm={isEditForm} />,
            },
        ];

        return sections;
    }, [category, form.control, form.formState.errors, isEditForm, users]);

    useEffect(() => {
        if (visibleCount > steps.length) {
            setVisibleCount(steps.length);
        }
    }, [visibleCount, steps.length]);

    const visibleSteps = steps.slice(0, visibleCount);
    const isAllVisible = visibleCount >= steps.length;
    const lastVisibleStep = steps[visibleCount - 1];

    async function handleContinue() {
        const isValid = await form.trigger(lastVisibleStep.fields as any, { shouldFocus: true });
        if (!isValid) return;
        setVisibleCount((c) => Math.min(c + 1, steps.length));
    }

    return (
        <div className="space-y-16">
            {visibleSteps.map((step, i) => {
                const isLast = i === visibleSteps.length - 1;
                return (
                    <div key={step.id}>
                        <div className="mb-4">
                            <h2 className="text-2xl font-bold text-primary">{i + 1}. {step.title}</h2>
                            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                            <hr className="mt-2 border-primary" />
                        </div>
                        {step.render()}
                        {isLast && (
                            <div className="flex mt-6">
                                {isAllVisible ? (
                                    <Button type="submit" disabled={isSubmitting}>
                                        {submitLabel}
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={handleContinue}>
                                        Continue
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
