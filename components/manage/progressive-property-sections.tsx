"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AgencyCustomizationRule, CreatePropertyFormValues, User } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, ArrowLeft, CornerDownRight } from "lucide-react";
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
    listingAgentAccountId: "Listing agent",
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
    submitDisabled?: boolean;
    submitLabel: string;
    /** Optional agency customization rule — enforced on top of Zod validation */
    agencyRule?: AgencyCustomizationRule | null;
    /*
    ::neup.documentation::progressive-property-step-advance-hook

    ::private

    Consumers can persist step state before navigation. Returning `false`
    blocks the section change so the UI does not move ahead when the save fails.

    ::private end
    ::end
    */
    onSectionAdvance?: (fromIndex: number, toIndex: number) => Promise<boolean | void> | boolean | void;
    canDropCreationDraft?: boolean;
    onDropCreationDraft?: () => Promise<boolean | void> | boolean | void;
    fieldChangeNotes?: Partial<Record<string, string>>;
    previousAmenities?: string;
    previousImages?: string[];
    listingContext?: {
        name: string;
        label: string;
        imageUrl?: string | null;
        agencyName?: string | null;
    } | null;
    postingProfile?: {
        name: string;
        id: string;
        label: string;
        description: string;
        canChange?: boolean;
    } | null;
    allowSectionJumping?: boolean;
    canEditOwnership?: boolean;
    listingAgentOptions?: Array<{ id: string; name: string; imageUrl?: string | null; agencyId?: string | null; agencyName?: string | null }>;
}

export function ProgressivePropertySections({
    form,
    users,
    isEditForm,
    isSubmitting,
    submitDisabled = false,
    submitLabel,
    agencyRule,
    onSectionAdvance,
    canDropCreationDraft = false,
    onDropCreationDraft,
    fieldChangeNotes,
    previousAmenities,
    previousImages,
    listingContext,
    postingProfile,
    allowSectionJumping = true,
    canEditOwnership = true,
    listingAgentOptions = [],
}: ProgressivePropertySectionsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [nextError, setNextError] = useState<string | null>(null);
    const [errorStepIndex, setErrorStepIndex] = useState<number | null>(null);
    const [isDroppingCreationDraft, setIsDroppingCreationDraft] = useState(false);
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
            render: () => <FeaturesAmenitiesSection control={form.control} fieldChangeNotes={fieldChangeNotes} previousAmenities={previousAmenities} />,
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
        ...(canEditOwnership ? [{
            id: "owners",
            section: "owners",
            title: "Owner Information",
            description: "Search and select one or more client owners for this property.",
            fields: ["owners"],
            render: () => <OwnerInfoSection control={form.control} setValue={form.setValue} users={users} formErrors={form.formState.errors} fieldChangeNotes={fieldChangeNotes} />,
        } satisfies PropertyFormStep] : []),
        {
            id: "photos",
            section: "photos",
            title: "Property Photos",
            description: "Upload photos that best represent the property.",
            fields: ["images"],
            render: () => <PropertyPhotosSection control={form.control} fieldChangeNotes={fieldChangeNotes} previousImages={previousImages} />,
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
            id: "listing-profile",
            section: "listing-profile",
            title: "Listing Profile",
            description: "Review who this listing is associated with and adjust the listing agent when allowed.",
            fields: ["listingAgentAccountId"],
            render: () => (
                <TitleDescriptionSection
                    control={form.control}
                    fieldChangeNotes={fieldChangeNotes}
                    listingContext={listingContext}
                    postingProfile={postingProfile}
                    canEditListingContext={canEditOwnership}
                    listingAgentOptions={listingAgentOptions}
                    showListingProfile
                    showPublishingCopy={false}
                />
            ),
        },
        {
            id: "copy",
            section: "copy",
            title: "Publishing and Copy",
            description: "Write the listing copy and control how it appears publicly.",
            fields: [
                "title",
                "description",
                "isPrivate",
                "showMap",
                "showOwnerInformation",
            ],
            render: () => (
                <TitleDescriptionSection
                    control={form.control}
                    fieldChangeNotes={fieldChangeNotes}
                    listingContext={listingContext}
                    postingProfile={postingProfile}
                    canEditListingContext={canEditOwnership}
                    listingAgentOptions={listingAgentOptions}
                    showListingProfile={false}
                    showPublishingCopy
                />
            ),
        },
    ], [canEditOwnership, category, fieldChangeNotes, form.control, isEditForm, listingAgentOptions, listingContext, postingProfile, previousAmenities, previousImages, users]);

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
        const canAdvance = await onSectionAdvance?.(activeIndex, i);
        if (canAdvance === false) return;
        setNextError(null);
        setErrorStepIndex(null);
        setActiveIndex(i);
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
        const canAdvance = await onSectionAdvance?.(activeIndex, next);
        if (canAdvance === false) return;
        setActiveIndex(next);
        replaceSectionParam(getSectionFromIndex(next));
    }

    async function handlePrev() {
        setNextError(null);
        setErrorStepIndex(null);
        const prev = Math.max(activeIndex - 1, 0);
        const canAdvance = await onSectionAdvance?.(activeIndex, prev);
        if (canAdvance === false) return;
        setActiveIndex(prev);
        replaceSectionParam(getSectionFromIndex(prev));
    }

    function handleCancel() {
        if (pathname.endsWith("/create")) {
            router.push("/manage/properties");
            return;
        }

        if (pathname.endsWith("/edit")) {
            router.push(pathname.replace(/\/edit$/, ""));
            return;
        }

        router.push("/manage/properties");
    }

    async function handleDropCreationDraft() {
        if (!onDropCreationDraft) return;
        setIsDroppingCreationDraft(true);
        try {
            const result = await onDropCreationDraft();
            if (result === false) {
                setIsDroppingCreationDraft(false);
            }
        } catch {
            setIsDroppingCreationDraft(false);
        }
    }

    const isLastStep = activeIndex === steps.length - 1;

    return (
        <div>
            {steps.map((step, i) => {
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
                        isClickable={allowSectionJumping && !isActive}
                    >
                        {step.render()}
                        {nextError && errorStepIndex === i && (
                            <p className="mt-4 whitespace-pre-line text-sm text-destructive">{nextError}</p>
                        )}
                        <div className="flex flex-col gap-2 mt-8 mb-6">
                            <div className="flex items-center gap-2">
                                {activeIndex > 0 && (
                                    <Button type="button" variant="outline" size="sm" onClick={handlePrev}>
                                        <ArrowLeft className="h-4 w-4" />
                                        Back
                                    </Button>
                                )}
                                {isLastStep ? (
                                    <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || submitDisabled}>{submitLabel}</Button>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={nextError ? "tertiary" : "secondary"}
                                        className={cn(
                                            nextError && "border-destructive text-destructive hover:bg-destructive/10"
                                        )}
                                        onClick={handleNext}
                                    >
                                        Continue
                                        <CornerDownRight className="h-4 w-4" />
                                    </Button>
                                )}
                                {activeIndex === 0 && !isLastStep && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructiveTertiary"
                                            >
                                                <AlertCircle className="h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Cancel property changes?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    You will leave this form. Any unsaved changes on this section may be lost.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-start sm:space-x-0">
                                                {canDropCreationDraft && onDropCreationDraft && (
                                                    <AlertDialogAction
                                                        className={cn(
                                                            buttonVariants({ variant: "destructive" }),
                                                            "hover:bg-destructive hover:text-destructive-foreground/80 active:bg-destructive active:text-destructive-foreground/70"
                                                        )}
                                                        disabled={isDroppingCreationDraft}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            void handleDropCreationDraft();
                                                        }}
                                                    >
                                                        {isDroppingCreationDraft ? "Dropping..." : "Drop Property"}
                                                    </AlertDialogAction>
                                                )}
                                                <AlertDialogAction
                                                    className="border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/25 hover:text-destructive active:bg-destructive/35"
                                                    onClick={handleCancel}
                                                >
                                                    Cancel
                                                </AlertDialogAction>
                                                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
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
    isClickable: boolean;
    children: React.ReactNode;
}

function Section({ index, title, description, isActive, hasError, onOpen, isClickable, children }: SectionProps) {
    return (
        <div
            className={cn(
                "group relative border-b border-border/40 transition-colors duration-200 hover:border-b-transparent last:border-b-0",
                "before:pointer-events-none before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-primary/45 before:opacity-0 before:transition-opacity before:duration-200",
                "after:pointer-events-none after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-primary/45 after:opacity-0 after:transition-opacity after:duration-200",
                isActive
                    ? "border-b-transparent before:bg-primary/80 after:bg-primary/80 before:opacity-100 after:opacity-100"
                    : isClickable
                        ? "hover:before:opacity-100 hover:after:opacity-100"
                        : "hover:border-b-border/40",
            )}
        >
            {/* Header — always visible, clickable when unlocked */}
            <button
                type="button"
                onClick={isClickable ? onOpen : undefined}
                aria-disabled={!isClickable}
                className={cn(
                    "w-full text-left py-4 px-1 transition-colors duration-200",
                    isClickable ? "cursor-pointer" : "cursor-not-allowed",
                )}
            >
                <div className="flex items-baseline gap-3">
                    <span className={cn(
                        "text-lg font-semibold transition-all duration-200 leading-tight shrink-0",
                        isActive
                            ? "text-primary"
                            : isClickable
                                ? "text-muted-foreground group-hover:text-primary group-hover:scale-105 group-hover:-translate-y-0.5"
                                : "text-muted-foreground group-hover:text-muted-foreground/60",
                        hasError && "animate-pulse text-destructive [animation-duration:1s]"
                    )}>
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                        <h2 className={cn(
                            "text-lg font-semibold transition-colors duration-200 leading-tight",
                            isActive
                                ? "text-primary"
                                : isClickable
                                    ? "text-foreground group-hover:text-primary"
                                    : "text-muted-foreground group-hover:text-muted-foreground/60",
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
                    <p className={cn(
                        "text-sm transition-colors duration-200",
                        isActive
                            ? "text-primary/80"
                            : isClickable
                                ? "text-muted-foreground group-hover:text-primary/80"
                                : "text-muted-foreground/70 group-hover:text-muted-foreground/50",
                    )}>
                        {description}
                    </p>
                </div>
            </button>

            {isActive && (
                <div className="px-1 pt-3 pb-6">
                    <div className="animate-in fade-in-0 duration-200">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
