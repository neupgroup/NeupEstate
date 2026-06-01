"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { AgencyCustomizationRule, CreatePropertyFormValues, User } from "@/types";
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
import { cn } from "@/lib/utils";
import { evaluateAgencyCustomization } from "@/lib/evaluate-agency-customization";

type PropertyFormStep = {
    id: string;
    title: string;
    description: string;
    fields: Array<keyof CreatePropertyFormValues | string>;
    render: () => React.ReactElement | null;
};

const FIELD_LABELS: Record<string, string> = {
    purpose: "Property purpose",
    purposes: "Property purpose",
    category: "Property type",
    categories: "Property type",
    type: "Property nature",
    types: "Property nature",
    area: "Area",
    areaUnit: "Area unit",
    "landDetails.area": "Land area",
    "landDetails.areaUnit": "Land area unit",
    "landDetails.facing": "Land facing",
    "pricing.currency": "Currency",
    "pricing.basis": "Price basis",
    "pricing.listed": "Listing price",
    "pricing.basisPrices": "Listing price",
    "pricing.basisNegotiablePrices": "Negotiable price",
    "pricing.basisFrequencies": "Rental period",
    "pricing.basisUnits": "Pricing unit",
    structuredLocation: "Location details",
    owners: "Owner information",
    images: "Property photos",
    title: "Title",
    description: "Description",
};

function labelForPath(path: string): string {
    if (FIELD_LABELS[path]) return FIELD_LABELS[path];

    const recordPath = path.split(".").slice(0, -1).join(".");
    if (FIELD_LABELS[recordPath]) return FIELD_LABELS[recordPath];

    const normalized = path
        .replace(/\.\d+(?=\.|$)/g, "")
        .replace(/\.[^.]+$/g, (part) => (/^[a-z0-9-]+$/i.test(part.slice(1)) ? "" : part));

    if (FIELD_LABELS[normalized]) return FIELD_LABELS[normalized];

    const last = path.split(".").filter(Boolean).pop() || "Field";
    return last
        .replace(/([A-Z])/g, " $1")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

function formatFieldError(path: string, message: string): string {
    const label = labelForPath(path);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage === "required" || lowerMessage.includes("required")) {
        return `❌ ${label} is required.`;
    }

    if (lowerMessage.includes("expected number") || lowerMessage.includes("received nan")) {
        return `❌ ${label} must be a valid number.`;
    }

    return `❌ ${label}: ${message}`;
}

interface ProgressivePropertySectionsProps {
    form: UseFormReturn<CreatePropertyFormValues>;
    users: User[];
    isEditForm: boolean;
    isSubmitting: boolean;
    submitLabel: string;
    /** Optional agency customization rule — enforced on top of Zod validation */
    agencyRule?: AgencyCustomizationRule | null;
}

export function ProgressivePropertySections({
    form,
    users,
    isEditForm,
    isSubmitting,
    submitLabel,
    agencyRule,
}: ProgressivePropertySectionsProps) {
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [unlockedUpTo, setUnlockedUpTo] = useState<number>(0);
    const [nextError, setNextError] = useState<string | null>(null);
    const [errorStepIndex, setErrorStepIndex] = useState<number | null>(null);
    const categories = (form.watch("categories" as any) as unknown as string[]) || [];
    const category = categories[0] as string | undefined;

    useEffect(() => {
        if (errorStepIndex === null) return;
        const timeout = window.setTimeout(() => setErrorStepIndex(null), 5000);
        return () => window.clearTimeout(timeout);
    }, [errorStepIndex]);

    const steps = useMemo<PropertyFormStep[]>(() => [
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
            fields: ["area", "areaUnit", "buildStart", "buildCompleted", "facing", "landDetails.facing", "floors", "onFloor", "landDetails", "plots", "apartmentUnits"],
            render: () => <PropertySpecificsSection control={form.control} category={category} />,
        },
        ...(categories.includes("Land") ? [] : [{
            id: "rooms",
            title: "Rooms & Space",
            description: "Specify the number of rooms, parking, and other spaces.",
            fields: ["bedrooms", "bathrooms", "kitchens", "diningRooms", "livingRooms", "carParkingSpots", "bikeParkingSpots"],
            render: () => <RoomsAndSpaceSection control={form.control} category={category} />,
        } satisfies PropertyFormStep]),
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
    ], [category, form.control, form.formState.errors, isEditForm, users]);

    function collectStepErrors(fields: string[]): string[] {
        const errors = form.formState.errors as Record<string, any>;
        const messages: string[] = [];

        function extractMessages(obj: any, path: string) {
            if (!obj || typeof obj !== "object") return;
            if (typeof obj.message === "string" && obj.message) {
                messages.push(formatFieldError(path, obj.message));
                return;
            }
            for (const key of Object.keys(obj)) {
                extractMessages(obj[key], `${path}.${key}`);
            }
        }

        for (const field of fields) {
            const candidateFields = field === "category"
                ? ["category", "categories"]
                : field === "type"
                    ? ["type", "types"]
                    : [field];

            for (const candidateField of candidateFields) {
                const parts = candidateField.split(".");
                let node: any = errors;
                for (const part of parts) {
                    node = node?.[part];
                    if (!node) break;
                }
                if (node) extractMessages(node, candidateField);
            }
        }

        return [...new Set(messages)];
    }

    async function goTo(i: number) {
        if (i > activeIndex) {
            const isValid = await form.trigger(steps[activeIndex].fields as any, { shouldFocus: true });
            if (!isValid) {
                const msgs = collectStepErrors(steps[activeIndex].fields as string[]);
                setNextError(msgs.length > 0 ? msgs.join("\n") : "❌ Please fix the errors above before continuing.");
                setErrorStepIndex(activeIndex);
                return;
            }
            // Agency rule check — only for fields belonging to this step
            if (agencyRule) {
                const stepFields = steps[activeIndex].fields as string[];
                const stepRule = {
                    required: agencyRule.required.filter(f =>
                        stepFields.some(sf => f === sf || f.startsWith(sf + '.') || sf.startsWith(f + '.'))
                    ),
                    optional: agencyRule.optional,
                };
                const agencyErrors = evaluateAgencyCustomization(stepRule, form.getValues() as any);
                const agencyMsgs = Object.values(agencyErrors);
                if (agencyMsgs.length > 0) {
                    setNextError(agencyMsgs.map((msg) => `❌ ${msg}`).join("\n"));
                    setErrorStepIndex(activeIndex);
                    return;
                }
            }
        }
        setNextError(null);
        setErrorStepIndex(null);
        setActiveIndex(i);
        setUnlockedUpTo((prev) => Math.max(prev, i));
    }

    async function handleNext() {
        const isValid = await form.trigger(steps[activeIndex].fields as any, { shouldFocus: true });
        if (!isValid) {
            const msgs = collectStepErrors(steps[activeIndex].fields as string[]);
            setNextError(msgs.length > 0 ? msgs.join("\n") : "❌ Please fix the errors above before continuing.");
            setErrorStepIndex(activeIndex);
            return;
        }
        // Agency rule check — only for fields belonging to this step
        if (agencyRule) {
            const stepFields = steps[activeIndex].fields as string[];
            const stepRule = {
                required: agencyRule.required.filter(f =>
                    stepFields.some(sf => f === sf || f.startsWith(sf + '.') || sf.startsWith(f + '.'))
                ),
                optional: agencyRule.optional,
            };
            const agencyErrors = evaluateAgencyCustomization(stepRule, form.getValues() as any);
            const agencyMsgs = Object.values(agencyErrors);
            if (agencyMsgs.length > 0) {
                setNextError(agencyMsgs.map((msg) => `❌ ${msg}`).join("\n"));
                setErrorStepIndex(activeIndex);
                return;
            }
        }
        setNextError(null);
        setErrorStepIndex(null);
        const next = Math.min(activeIndex + 1, steps.length - 1);
        setActiveIndex(next);
        setUnlockedUpTo((prev) => Math.max(prev, next));
    }

    function handlePrev() {
        setNextError(null);
        setErrorStepIndex(null);
        setActiveIndex((i) => Math.max(i - 1, 0));
    }

    const isLastStep = activeIndex === steps.length - 1;

    return (
        <div className="space-y-1">
            {steps.slice(0, unlockedUpTo + 1).map((step, i) => {
                const isActive = i === activeIndex;
                return (
                    <Section
                        key={step.id}
                        index={i}
                        title={step.title}
                        description={step.description}
                        isActive={isActive}
                        hasError={errorStepIndex === i}
                        onOpen={() => goTo(i)}
                    >
                        {step.render()}
                        {nextError && errorStepIndex === i && (
                            <p className="mt-4 whitespace-pre-line text-sm text-destructive">{nextError}</p>
                        )}
                        <div className="flex flex-col gap-2 mt-4 mb-6">
                            <div className="flex items-center gap-2">
                                {activeIndex > 0 && (
                                    <Button type="button" variant="outline" size="sm" onClick={handlePrev}>
                                        Previous
                                    </Button>
                                )}
                                {isLastStep ? (
                                    <Button type="submit" size="sm" disabled={isSubmitting}>{submitLabel}</Button>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={nextError ? "outline" : "default"}
                                        className={cn(nextError && "border-destructive text-destructive hover:bg-destructive/10")}
                                        onClick={handleNext}
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Section>
                );
            })}
        </div>
    );
}

interface SectionProps {
    index: number;
    title: string;
    description: string;
    isActive: boolean;
    hasError: boolean;
    onOpen: () => void;
    children: React.ReactNode;
}

function Section({ index, title, description, isActive, hasError, onOpen, children }: SectionProps) {
    const bodyRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number>(0);
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        if (!bodyRef.current) return;
        if (isActive) {
            setSettled(false);
            // Force a reflow so transition fires from 0
            setHeight(bodyRef.current.scrollHeight);
        } else {
            setSettled(false);
            setHeight(0);
        }
    }, [isActive]);

    function onTransitionEnd() {
        if (isActive) setSettled(true); // release fixed height so content can reflow
    }

    return (
        <div className={cn("border-b border-border/40 last:border-b-0")}>
            {/* Header — always visible, clickable when unlocked */}
            <button
                type="button"
                onClick={onOpen}
                className={cn(
                    "w-full text-left py-4 px-1 group",
                    !isActive && "cursor-pointer",
                )}
            >
                <div className="flex items-baseline gap-3">
                    <span className={cn(
                        "text-lg font-semibold transition-colors leading-tight shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground",
                        hasError && "animate-pulse text-destructive [animation-duration:1s]"
                    )}>
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                        <h2 className={cn(
                            "text-lg font-semibold transition-colors leading-tight",
                            isActive ? "text-primary" : "text-foreground group-hover:text-primary",
                            hasError && "animate-pulse text-destructive [animation-duration:1s]"
                        )}>
                            {title}
                        </h2>
                    </div>
                </div>
                {/* Description + separator only when active */}
                <div className={cn(
                    "overflow-hidden transition-all duration-300",
                    isActive ? "max-h-10 opacity-100 mt-1" : "max-h-10 opacity-100 mt-1"
                )}>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {isActive && <hr className="mt-3 border-primary" />}
            </button>

            {/* Body — height animates open/closed */}
            <div
                style={settled ? undefined : { height: `${height}px` }}
                className={cn(
                    "overflow-hidden",
                    !settled && "transition-[height] duration-500 ease-in-out"
                )}
                onTransitionEnd={onTransitionEnd}
            >
                <div ref={bodyRef} className="px-1 pb-6">
                    <div className={cn(
                        "transition-opacity duration-300",
                        isActive ? "opacity-100" : "opacity-0"
                    )}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
