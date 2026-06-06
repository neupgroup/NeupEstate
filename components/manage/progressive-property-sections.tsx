"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { cn } from "@/logica/core/utils";
import { evaluateAgencyCustomization } from "@/logica/core/evaluate-agency-customization";

type PropertyFormStep = {
    id: string;
    section: string;
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
    "pricing.basisNegotiable": "Negotiable option",
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

    if (lowerMessage.includes("expected boolean") || lowerMessage.includes("received null")) {
        return `❌ ${label} must be set to yes or no.`;
    }

    return `❌ ${label}: ${message}`;
}

function getShowPriceBasisError(values: CreatePropertyFormValues): string | null {
    const pricing = values.pricing;
    const priceDisplayMode = pricing?.priceDisplayMode || "show-price";
    if (priceDisplayMode !== "show-price") return null;

    const selectedBasis = pricing?.basis;
    const selectedBasisPrice = selectedBasis ? Number(pricing?.basisPrices?.[selectedBasis] ?? 0) : 0;
    const hasAnyFilledBasisPrice = Object.values(pricing?.basisPrices ?? {}).some((value) => Number(value ?? 0) > 0);

    if (!selectedBasis || selectedBasisPrice <= 0 || !hasAnyFilledBasisPrice) {
        return "❌ Price Basis requires at least one selected basis with a listing price.";
    }

    return null;
}

interface ProgressivePropertySectionsProps {
    form: UseFormReturn<CreatePropertyFormValues>;
    users: User[];
    isEditForm: boolean;
    isSubmitting: boolean;
    submitLabel: string;
    /** Optional agency customization rule — enforced on top of Zod validation */
    agencyRule?: AgencyCustomizationRule | null;
    onSectionAdvance?: (fromIndex: number, toIndex: number) => Promise<void> | void;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

export function ProgressivePropertySections({
    form,
    users,
    isEditForm,
    isSubmitting,
    submitLabel,
    agencyRule,
    onSectionAdvance,
    fieldChangeNotes,
}: ProgressivePropertySectionsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [unlockedUpTo, setUnlockedUpTo] = useState<number>(0);
    const [nextError, setNextError] = useState<string | null>(null);
    const [errorStepIndex, setErrorStepIndex] = useState<number | null>(null);
    const categories = (form.watch("categories" as any) as unknown as string[]) || [];
    const category = categories[0] as string | undefined;

    const steps = useMemo<PropertyFormStep[]>(() => [
        {
            id: "basics",
            section: "basic",
            title: "Basic Information",
            description: "Set the listing purpose, property type, and nature.",
            fields: ["purposes", "category", "type"],
            render: () => <BasicDetailsSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "specifics",
            section: "specifics",
            title: "Property Specifics",
            description: "Enter the size, age, floors, and structural details.",
            fields: ["area", "areaUnit", "buildStart", "buildCompleted", "facing", "landDetails.facing", "floors", "onFloor", "landDetails", "plots", "apartmentUnits"],
            render: () => <PropertySpecificsSection control={form.control} category={category} fieldChangeNotes={fieldChangeNotes} />,
        },
        ...(categories.includes("Land") ? [] : [{
            id: "rooms",
            section: "space",
            title: "Rooms & Space",
            description: "Specify the number of rooms, parking, and other spaces.",
            fields: ["bedrooms", "bathrooms", "kitchens", "diningRooms", "livingRooms", "carParkingSpots", "bikeParkingSpots"],
            render: () => <RoomsAndSpaceSection control={form.control} category={category} fieldChangeNotes={fieldChangeNotes} />,
        } satisfies PropertyFormStep]),
        {
            id: "features",
            section: "ammenities",
            title: "Features & Amenities",
            description: "List the key features and amenities available at the property.",
            fields: ["amenities"],
            render: () => <FeaturesAmenitiesSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "pricing",
            section: "pricing",
            title: "Pricing Details",
            description: "Set the listed price, payment basis, and negotiability.",
            fields: ["pricing"],
            render: () => <PricingDetailsSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "location",
            section: "location",
            title: "Location Details",
            description: "Provide the address, geo-coordinates, and nearby landmarks.",
            fields: ["structuredLocation"],
            render: () => <LocationDetailsSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "owners",
            section: "owners",
            title: "Owner Information",
            description: "Search and select one or more client owners for this property.",
            fields: ["owners"],
            render: () => <OwnerInfoSection control={form.control} setValue={form.setValue} users={users} formErrors={form.formState.errors} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "photos",
            section: "photos",
            title: "Property Photos",
            description: "Upload photos that best represent the property.",
            fields: ["images"],
            render: () => <PropertyPhotosSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "documents",
            section: "documents",
            title: "Property Documents",
            description: "Attach ownership documents, blueprints, or legal papers.",
            fields: ["documents"],
            render: () => <PropertyDocumentsSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
        {
            id: "copy",
            section: "copy",
            title: "Title & Description",
            description: "Write a compelling title and description for the listing.",
            fields: ["title", "description"],
            render: () => <TitleDescriptionSection control={form.control} fieldChangeNotes={fieldChangeNotes} />,
        },
    ], [category, form.control, form.formState.errors, isEditForm, users]);

    useEffect(() => {
        if (errorStepIndex === null) return;
        const timeout = window.setTimeout(() => setErrorStepIndex(null), 5000);
        return () => window.clearTimeout(timeout);
    }, [errorStepIndex]);

    function getSectionFromIndex(index: number): string {
        return steps[index]?.section || steps[0]?.section || "basic";
    }

    function getIndexFromSection(section: string | null | undefined): number {
        const normalized = (section || "").trim().toLowerCase();
        if (!normalized) return 0;
        const found = steps.findIndex((step) => step.section === normalized || step.id === normalized);
        return found >= 0 ? found : 0;
    }

    function replaceSectionParam(section: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("section", section);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    useEffect(() => {
        const initialIndex = getIndexFromSection(searchParams.get("section"));
        setActiveIndex(initialIndex);
        setUnlockedUpTo((current) => Math.max(current, initialIndex));
        setNextError(null);
        setErrorStepIndex(null);
        // Keep the URL normalized when the user enters through a step alias.
        if (searchParams.get("section") !== getSectionFromIndex(initialIndex)) {
            replaceSectionParam(getSectionFromIndex(initialIndex));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

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

    function collectCustomStepErrors(step: PropertyFormStep): string[] {
        const messages: string[] = [];

        if (step.id === "pricing") {
            const pricingError = getShowPriceBasisError(form.getValues());
            if (pricingError) messages.push(pricingError);
        }

        return messages;
    }

    async function goTo(i: number) {
        if (i === activeIndex) return;
        if (i > activeIndex) {
            const isValid = await form.trigger(steps[activeIndex].fields as any, { shouldFocus: true });
            if (!isValid) {
                const msgs = collectStepErrors(steps[activeIndex].fields as string[]);
                setNextError(msgs.length > 0 ? msgs.join("\n") : "❌ Please fix the errors above before continuing.");
                setErrorStepIndex(activeIndex);
                return;
            }
            const customMsgs = collectCustomStepErrors(steps[activeIndex]);
            if (customMsgs.length > 0) {
                setNextError(customMsgs.join("\n"));
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
        await onSectionAdvance?.(activeIndex, i);
        setNextError(null);
        setErrorStepIndex(null);
        setActiveIndex(i);
        setUnlockedUpTo((prev) => Math.max(prev, i));
        replaceSectionParam(getSectionFromIndex(i));
    }

    async function handleNext() {
        const isValid = await form.trigger(steps[activeIndex].fields as any, { shouldFocus: true });
        if (!isValid) {
            const msgs = collectStepErrors(steps[activeIndex].fields as string[]);
            setNextError(msgs.length > 0 ? msgs.join("\n") : "❌ Please fix the errors above before continuing.");
            setErrorStepIndex(activeIndex);
            return;
        }
        const customMsgs = collectCustomStepErrors(steps[activeIndex]);
        if (customMsgs.length > 0) {
            setNextError(customMsgs.join("\n"));
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
        await onSectionAdvance?.(activeIndex, next);
        setActiveIndex(next);
        setUnlockedUpTo((prev) => Math.max(prev, next));
        replaceSectionParam(getSectionFromIndex(next));
    }

    async function handlePrev() {
        setNextError(null);
        setErrorStepIndex(null);
        const prev = Math.max(activeIndex - 1, 0);
        await onSectionAdvance?.(activeIndex, prev);
        setActiveIndex(prev);
        setUnlockedUpTo((i) => Math.max(i, prev));
        replaceSectionParam(getSectionFromIndex(prev));
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

            {isActive && (
                <div className="px-1 pb-6">
                    <div className="animate-in fade-in-0 duration-200">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
