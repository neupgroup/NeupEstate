"use client";

import { useEffect, useMemo } from "react";
import { Control, useFormContext } from "react-hook-form";
import { Check, X } from "lucide-react";
import { CreatePropertyFormValues, CurrencySchema } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PricingDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

type BasisOption = {
    value: NonNullable<CreatePropertyFormValues["pricing"]>["basis"];
    label: string;
    description: string;
    frequency?: boolean;
    unit?: boolean;
};

const HOUSE_CATEGORIES = new Set(["House", "Bungalow", "Villa", "Multiplex"]);
const APARTMENT_CATEGORIES = new Set(["Apartment", "Penthouse", "Flat"]);
const RENTAL_FREQUENCIES = ["Monthly", "Quarterly", "Half-yearly", "Yearly"] as const;
const LAND_UNITS = ["Aana", "Ropani", "Paisa", "Daam", "Bigha", "Kattha", "Dhur", "Sqft", "Sqm"] as const;
const PRICE_DISPLAY_OPTIONS = [
    { value: "show-price", label: "Show price", description: "Display entered prices publicly." },
    { value: "price-on-call", label: "Price on call", description: "Hide prices and ask buyers to call." },
    { value: "offer-yours-first", label: "Offer yours first", description: "Hide prices and ask buyers to make an offer." },
] as const;

function getBasisOptionsForPair(category?: string, purpose?: string): BasisOption[] {
    const isSale = purpose === "Sale";
    const isRental = purpose === "Rent" || purpose === "Lease";
    const isHouse = category ? HOUSE_CATEGORIES.has(category) : false;
    const isApartment = category ? APARTMENT_CATEGORIES.has(category) : false;
    const isLand = category === "Land";

    if (isHouse && isSale) {
        return [{ value: "house-sale-flat", label: "House sale price", description: "Flat price" }];
    }

    if (isHouse && isRental) {
        return [
            { value: "house-rent", label: "House rental price", description: "Choose monthly, quarterly, yearly, or another rental period.", frequency: true },
        ];
    }

    if (isLand && isSale) {
        return [
            { value: "land-sale-unit", label: "Land unit sale price", description: `Choose per aana, ropani, paisa, or another unit.`, unit: true },
            { value: "land-sale-flat", label: "Land flat sale price", description: "Flat price" },
        ];
    }

    if (isLand && isRental) {
        return [
            { value: "land-rent-unit", label: "Land unit rental price", description: "Choose rental period and land unit.", frequency: true, unit: true },
            { value: "land-rent-flat", label: "Land flat rental price", description: "Choose monthly, quarterly, yearly, or another rental period.", frequency: true },
        ];
    }

    if (isApartment && isSale) {
        return [{ value: "apartment-sale-flat", label: "Apartment sale price", description: "Flat price" }];
    }

    if (isApartment && isRental) {
        return [
            { value: "apartment-rent", label: "Apartment rental price", description: "Choose monthly, quarterly, yearly, or another rental period.", frequency: true },
        ];
    }

    return [
        { value: "flat-price", label: "Flat price", description: "Total listed price" },
        { value: "per-month", label: "Monthly price", description: "Per month price" },
        { value: "per-annum", label: "Annual price", description: "Per annum price" },
    ];
}

function getBasisOptions(categories: string[], purposes: string[]): BasisOption[] {
    const selectedCategories = categories.length ? categories : [undefined];
    const selectedPurposes = purposes.length ? purposes : [undefined];
    const options = selectedCategories.flatMap((category) =>
        selectedPurposes.flatMap((purpose) => getBasisOptionsForPair(category, purpose)),
    );
    const seen = new Set<string>();
    return options.filter((option) => {
        if (seen.has(option.value || "")) return false;
        seen.add(option.value || "");
        return true;
    });
}

export function PricingDetailsSection({ control }: PricingDetailsSectionProps) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const categories = (watch("categories" as any) as unknown as string[]) || [];
    const purposes = watch("purposes") || [];
    const selectedBasis = watch("pricing.basis");
    const priceDisplayMode = watch("pricing.priceDisplayMode") || "show-price";
    const basisNegotiable = watch("pricing.basisNegotiable" as any) as Record<string, boolean> | undefined;
    const basisPrices = watch("pricing.basisPrices" as any) as Record<string, number | undefined> | undefined;
    const basisNegotiablePrices = watch("pricing.basisNegotiablePrices" as any) as Record<string, number | undefined> | undefined;

    const basisOptions = useMemo(
        () => getBasisOptions(categories, purposes as string[]),
        [categories.join("|"), (purposes as string[]).join("|")],
    );

    const activeOption = useMemo(
        () => basisOptions.find((option) => option.value === selectedBasis) || null,
        [basisOptions, selectedBasis],
    );
    const activeOptions = activeOption ? [activeOption] : [];
    const inactiveOptions = basisOptions.filter((option) => option.value !== selectedBasis);

    useEffect(() => {
        if (selectedBasis && !basisOptions.some((option) => option.value === selectedBasis)) {
            setValue("pricing.basis", undefined as any, { shouldDirty: true, shouldValidate: true });
        }
    }, [basisOptions, selectedBasis, setValue]);

    function selectBasis(option: BasisOption) {
        if (!option.value) return;
        if (option.frequency) {
            setValue(`pricing.basisFrequencies.${option.value}` as any, "Monthly", { shouldDirty: true, shouldValidate: true });
        }
        if (option.unit) {
            setValue(`pricing.basisUnits.${option.value}` as any, "Aana", { shouldDirty: true, shouldValidate: true });
        }
        setValue("pricing.basis", option.value, { shouldDirty: true, shouldValidate: true });
    }

    function removeBasis(option: BasisOption) {
        if (!option.value) return;
        setValue(`pricing.basisPrices.${option.value}` as any, null, { shouldDirty: true, shouldValidate: true });
        setValue(`pricing.basisNegotiable.${option.value}` as any, null, { shouldDirty: true, shouldValidate: true });
        setValue(`pricing.basisNegotiablePrices.${option.value}` as any, null, { shouldDirty: true, shouldValidate: true });

        if (selectedBasis === option.value) {
            setValue("pricing.basis", undefined as any, { shouldDirty: true, shouldValidate: true });
        }
    }

    function negotiablePriceError(option: BasisOption): string | null {
        if (!option.value) return null;
        const listingPrice = Number(basisPrices?.[option.value] ?? 0);
        const negotiablePrice = Number(basisNegotiablePrices?.[option.value] ?? 0);
        if (listingPrice > 0 && negotiablePrice > listingPrice) {
            return "Negotiable amount can't be more than listing amount.";
        }
        return null;
    }

    return (
        <section className="space-y-6">
            <FormField
                control={control}
                name="pricing.currency"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="max-w-xs">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {CurrencySchema.options.map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="pricing.priceDisplayMode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Public Price Display</FormLabel>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {PRICE_DISPLAY_OPTIONS.map((option) => {
                                const isSelected = field.value === option.value || (!field.value && option.value === "show-price");
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => field.onChange(option.value)}
                                        aria-pressed={isSelected}
                                        className={cn(
                                            "flex min-h-20 items-start gap-3 rounded-lg border-2 bg-background p-4 text-left transition-all",
                                            isSelected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground",
                                        )}
                                    >
                                        <span className={cn(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground",
                                        )}>
                                            {isSelected ? <Check className="h-3 w-3" /> : null}
                                        </span>
                                        <span className="space-y-1">
                                            <span className="block text-sm font-semibold">{option.label}</span>
                                            <span className="block text-xs text-muted-foreground">{option.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {priceDisplayMode !== "show-price" && (
                            <p className="text-xs text-muted-foreground">
                                Public pages will show "{PRICE_DISPLAY_OPTIONS.find((option) => option.value === priceDisplayMode)?.label}" instead of any entered price.
                            </p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="pricing.basis"
                render={() => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Price Basis</FormLabel>
                        {inactiveOptions.length > 0 && (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {inactiveOptions.map((option) => {
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => selectBasis(option)}
                                            className={cn(
                                                "flex min-h-20 items-start gap-3 rounded-lg border-2 bg-background p-4 text-left transition-all",
                                                "border-border hover:border-muted-foreground",
                                            )}
                                        >
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground" />
                                            <span className="space-y-1">
                                                <span className="block text-sm font-semibold">{option.label}</span>
                                                <span className="block text-xs text-muted-foreground">{option.description}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            {activeOptions.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeOptions.map((option, index) => (
                        <div key={option.value} className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="mb-4 flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-bold text-primary">{option.label}</h3>
                                    <p className="text-xs font-medium text-muted-foreground">{option.description}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeBasis(option)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                                    aria-label={`Remove ${option.label}`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="rounded-xl bg-muted p-3">
                                <div className="grid grid-cols-1 gap-4">
                                    {(option.frequency || option.unit) && (
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {option.frequency && (
                                                <FormField
                                                    control={control}
                                                    name={`pricing.basisFrequencies.${option.value}` as any}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Rental Period</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value || "Monthly"}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select period" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {RENTAL_FREQUENCIES.map((frequency) => (
                                                                        <SelectItem key={frequency} value={frequency}>{frequency}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {option.unit && (
                                                <FormField
                                                    control={control}
                                                    name={`pricing.basisUnits.${option.value}` as any}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Pricing Unit</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value || "Aana"}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select unit" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {LAND_UNITS.map((unit) => (
                                                                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    )}

                                    <FormField
                                        control={control}
                                        name={`pricing.basisPrices.${option.value}` as any}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Listing Price</FormLabel>
                                                <FormControl>
                                                    <PriceInput
                                                        placeholder="e.g., 150000"
                                                        value={field.value?.toString() || ""}
                                                        onChange={(value) => {
                                                            const numericValue = value ? Number(value) : undefined;
                                                            field.onChange(numericValue);
                                                            if (index === 0) {
                                                                setValue("pricing.listed", numericValue ?? 0, { shouldDirty: true, shouldValidate: true });
                                                                setValue("pricing.basis", option.value, { shouldDirty: true, shouldValidate: true });
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {basisNegotiable?.[option.value || ""] ? (
                                        <FormField
                                            control={control}
                                            name={`pricing.basisNegotiablePrices.${option.value}` as any}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Negotiable Price</FormLabel>
                                                    <FormControl>
                                                        <PriceInput
                                                            placeholder="e.g., 145000"
                                                            value={field.value?.toString() || ""}
                                                            onChange={(value) => {
                                                                const numericValue = value ? Number(value) : undefined;
                                                                field.onChange(numericValue);
                                                                if (!numericValue && option.value) {
                                                                    setValue(`pricing.basisNegotiable.${option.value}` as any, false, { shouldDirty: true, shouldValidate: true });
                                                                    return;
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                    {negotiablePriceError(option) && (
                                                        <p className="text-xs text-destructive">{negotiablePriceError(option)}</p>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ) : (
                                        <FormField
                                            control={control}
                                            name={`pricing.basisNegotiable.${option.value}` as any}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3 shadow-sm">
                                                    <FormLabel>Is Negotiable?</FormLabel>
                                                    <FormControl>
                                                        <Switch
                                                            checked={Boolean(field.value)}
                                                            onCheckedChange={(checked) => {
                                                                field.onChange(checked);
                                                                if (checked && option.value) {
                                                                    const listingPrice = basisPrices?.[option.value];
                                                                    setValue(`pricing.basisNegotiablePrices.${option.value}` as any, listingPrice, { shouldDirty: true });
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <FormField
                control={control}
                name="pricing.options"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Payment Options</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., cash, loan, mortgage" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>
    );
}
