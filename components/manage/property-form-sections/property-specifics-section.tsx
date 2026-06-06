"use client";

import { Control, useFieldArray, useFormContext } from "react-hook-form";
import {
    CreatePropertyFormValues,
    LandTopographySchema,
    LandUsageSchema,
    LandZoningSchema,
} from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectionCards } from "@/components/ui/selection-cards";
import { AreaInput } from "@/components/ui/area-input";
import { CounterCard } from "@/components/ui/counter-card";
import { FacingInput } from "@/components/ui/facing-input";
import { YearPickerCard } from "@/components/ui/year-picker-card";
import { RoadAccessCard } from "@/components/ui/road-access-card";
import { PlusCircle, Trash2 } from "lucide-react";

interface PropertySpecificsSectionProps {
    control: Control<CreatePropertyFormValues>;
    category: string | undefined;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

const HOUSE_TYPES       = ["House", "Bungalow", "Villa", "Multiplex"];
const APARTMENT_TYPES   = ["Apartment", "Penthouse"];
const FLAT_TYPES        = ["Flat"];
const LAND_TYPES        = ["Land"];
const COMMERCIAL_TYPES  = ["Commercial Space", "Shop Space"];
const HAS_DUAL_AREA_FACING = [...HOUSE_TYPES, ...COMMERCIAL_TYPES, ...FLAT_TYPES];

function FF({ control, name, label, placeholder, type = "text" }: { control: any; name: any; label: string; placeholder?: string; type?: string }) {
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl><Input type={type} placeholder={placeholder} {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function Note({ text }: { text?: string }) {
    if (!text) return null;
    return <p className="text-xs text-muted-foreground">{text}</p>;
}

function SelectionField({ name, label, options }: { name: string; label: string; options: readonly string[] }) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const value = (watch(name as any) as string | undefined) ?? "";
    return (
        <FormField name={name as any} render={() => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <SelectionCards
                    options={options}
                    selected={value ? [value] : []}
                    onToggle={(opt) => setValue(name as any, value === opt ? undefined : opt as any, { shouldDirty: true, shouldValidate: true })}
                    className="grid-cols-2 sm:grid-cols-4"
                />
                <FormMessage />
            </FormItem>
        )} />
    );
}

function FurnishingField({ name }: { name: string }) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const value = (watch(name as any) as string | undefined) ?? "";
    const options = [
        { value: "Furnished", label: "Furnished" },
        { value: "Semi-Furnished", label: "Semi Furnished" },
        { value: "Unfurnished", label: "Non Furnished" },
    ] as const;

    return (
        <FormField name={name as any} render={() => (
            <FormItem>
                <FormLabel className="flex items-center gap-2 text-base font-bold text-foreground">
                    <span>🛋️</span>
                    <span>Furnishing</span>
                </FormLabel>
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isSelected = value === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setValue(name as any, isSelected ? undefined : option.value as any, { shouldDirty: true, shouldValidate: true })}
                                className={[
                                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                    "border-border bg-background text-foreground hover:border-foreground hover:text-foreground",
                                    isSelected ? "border-foreground bg-black/5 text-foreground" : "",
                                ].join(" ")}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function CompassField({ name, label, variant, note }: { name: string; label: string; variant?: "house" | "land"; note?: string }) {
    return (
        <FormField name={name as any} render={() => (
            <FormItem>
                <FormControl>
                    <FacingInput name={name} label={label} variant={variant} note={note} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )} />
    );
}

export function PropertySpecificsSection({ control, category, fieldChangeNotes }: PropertySpecificsSectionProps) {
    const { fields: plotFields, append: appendPlot, remove: removePlot } = useFieldArray({ control, name: "plots" });
    const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control, name: "apartmentUnits" });

    const isDualAreaFacing = HAS_DUAL_AREA_FACING.includes(category ?? "");
    const isHouse      = HOUSE_TYPES.includes(category ?? "");
    const isApartment  = APARTMENT_TYPES.includes(category ?? "");
    const isFlat       = FLAT_TYPES.includes(category ?? "");
    const isLand       = LAND_TYPES.includes(category ?? "");
    const isCommercial = COMMERCIAL_TYPES.includes(category ?? "");

    return (
        <section className="space-y-10">

            {/* ── Dual facing + area: House/Bungalow/Villa/Multiplex/Commercial/Shop/Flat ── */}
            {isDualAreaFacing && (
                <div className="space-y-6">
                    <div className="space-y-8">
                        <div className="space-y-1">
                            <AreaInput label="House Area" className="w-full" note={fieldChangeNotes?.area} />
                        </div>
                        <div className="space-y-1">
                            <AreaInput label="Property (Land) Area" name="landDetails.area" className="w-full" note={fieldChangeNotes?.["landDetails.area"]} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <CompassField name="facing" label="House Facing" variant="house" note={fieldChangeNotes?.facing} />
                        <CompassField name="landDetails.facing" label="Land Facing" variant="land" note={fieldChangeNotes?.["landDetails.facing"]} />
                    </div>
                </div>
            )}

            {/* ── Single facing + area: Apartment / Penthouse ── */}
            {isApartment && (
                <div className="space-y-6">
                    <div className="space-y-1">
                        <AreaInput label="Total Area" note={fieldChangeNotes?.area} />
                    </div>
                    <CompassField name="facing" label="Property Facing" variant="house" note={fieldChangeNotes?.facing} />
                </div>
            )}

            {/* ── House / Bungalow / Villa / Multiplex ── */}
            {isHouse && (
                <div className="space-y-6">
                    <CounterCard name="floors" label="Total Floors" emoji="🏢" sublabel="Number of Floors" steps={[-1, 1, 2]} note={fieldChangeNotes?.floors} />
                    <div className="space-y-8">
                        <div className="space-y-1">
                            <YearPickerCard name="buildStart" label="Build Start Year" emoji="🏗️" note={fieldChangeNotes?.buildStart} />
                        </div>
                        <div className="space-y-1">
                            <YearPickerCard name="buildCompleted" label="Build End Year" emoji="🏁" note={fieldChangeNotes?.buildCompleted} />
                        </div>
                    </div>
                    <RoadAccessCard name="roadAccess" note={fieldChangeNotes?.roadAccess} />
                    <FurnishingField name="apartmentDetails.furnishing" />
                </div>
            )}

            {/* ── Flat ── */}
            {isFlat && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <CounterCard name="onFloor" label="On Floor" emoji="📏" sublabel="Floor Number" steps={[-1, 1, 2]} note={fieldChangeNotes?.onFloor} />
                        </div>
                        <div className="space-y-1">
                            <CounterCard name="floors" label="Total Floors" emoji="🏢" sublabel="Number of Floors" steps={[-1, 1, 2]} note={fieldChangeNotes?.floors} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="space-y-1">
                            <YearPickerCard name="buildStart" label="Build Start Year" emoji="🏗️" note={fieldChangeNotes?.buildStart} />
                        </div>
                        <div className="space-y-1">
                            <YearPickerCard name="buildCompleted" label="Build End Year" emoji="🏁" note={fieldChangeNotes?.buildCompleted} />
                        </div>
                    </div>
                    <FurnishingField name="apartmentDetails.furnishing" />
                </div>
            )}

            {/* ── Apartment / Penthouse ── */}
            {isApartment && (
                <div className="space-y-6">
                    <div className="space-y-8">
                        <CounterCard name="onFloor" label="On Floor"     emoji="📏" sublabel="Floor Number"    steps={[-1, 1, 2]} note={fieldChangeNotes?.onFloor} />
                        <CounterCard name="floors"  label="Total Floors" emoji="🏢" sublabel="Number of Floors" steps={[-1, 1, 2]} note={fieldChangeNotes?.floors} />
                    </div>
                    <div className="space-y-8">
                        <YearPickerCard name="buildStart"     label="Build Start Year" emoji="🏗️" note={fieldChangeNotes?.buildStart} />
                        <YearPickerCard name="buildCompleted" label="Build End Year"   emoji="🏁" note={fieldChangeNotes?.buildCompleted} />
                    </div>
                    <FurnishingField name="apartmentDetails.furnishing" />

                    {/* Individual Units */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Individual Units (optional)</p>
                        {unitFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Unit {index + 1}</span>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField control={control} name={`apartmentUnits.${index}.id`} render={({ field }) => (
                                        <FormItem><FormLabel>Unit ID</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`apartmentUnits.${index}.onFloor`} render={({ field }) => (
                                        <FormItem><FormLabel>Floor</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`apartmentUnits.${index}.bedrooms`} render={({ field }) => (
                                        <FormItem><FormLabel>Bedrooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={control} name={`apartmentUnits.${index}.bathrooms`} render={({ field }) => (
                                        <FormItem><FormLabel>Bathrooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="col-span-2">
                                        <div className="space-y-1">
                                            <AreaInput label="Area" name={`apartmentUnits.${index}.area`} />
                                            <Note text={fieldChangeNotes?.[`apartmentUnits.${index}.area`]} />
                                        </div>
                                    </div>
                                    <FurnishingField name={`apartmentUnits.${index}.furnishing`} />
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendUnit({ id: `unit-${unitFields.length + 1}` })}>
                            <PlusCircle className="mr-2 h-4 w-4" />Add Unit
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Land ── */}
            {isLand && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="space-y-1"><FF control={control} name="landDetails.frontage" label="Frontage (ft)" placeholder="e.g., 20" type="number" /><Note text={fieldChangeNotes?.["landDetails.frontage"]} /></div>
                        <div className="space-y-1"><FF control={control} name="landDetails.depth" label="Depth (ft)" placeholder="e.g., 50" type="number" /><Note text={fieldChangeNotes?.["landDetails.depth"]} /></div>
                    </div>
                    <div className="space-y-1"><RoadAccessCard name="roadAccess" /><Note text={fieldChangeNotes?.roadAccess} /></div>
                    <SelectionField name="landDetails.usage"      label="Usage"      options={LandUsageSchema.options} />
                    <SelectionField name="landDetails.zoning"     label="Zoning"     options={LandZoningSchema.options} />
                    <SelectionField name="landDetails.topography" label="Topography" options={LandTopographySchema.options} />

                    {/* Plots */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Plots / Sub-divisions (optional)</p>
                        {plotFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Plot {index + 1}</span>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removePlot(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField control={control} name={`plots.${index}.id`} render={({ field }) => (
                                        <FormItem><FormLabel>Plot ID</FormLabel><FormControl><Input placeholder="e.g., PLOT-A" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="col-span-2">
                                        <div className="space-y-1">
                                            <AreaInput label="Area" name={`plots.${index}.area`} />
                                            <Note text={fieldChangeNotes?.[`plots.${index}.area`]} />
                                        </div>
                                    </div>
                                    <FF control={control} name={`plots.${index}.frontage`} label="Frontage (ft)" type="number" />
                                    <FF control={control} name={`plots.${index}.depth`}    label="Depth (ft)"    type="number" />
                                    <SelectionField name={`plots.${index}.zoning`}     label="Zoning"     options={LandZoningSchema.options} />
                                    <SelectionField name={`plots.${index}.topography`} label="Topography" options={LandTopographySchema.options} />
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPlot({ id: `plot-${plotFields.length + 1}`, area: undefined })}>
                            <PlusCircle className="mr-2 h-4 w-4" />Add Plot
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Commercial / Shop Space ── */}
            {isCommercial && (
                <div className="space-y-6">
                    <div className="space-y-1">
                        <CounterCard name="floors" label="Floor Number" emoji="🏢" sublabel="Floor Number" steps={[-1, 1, 2]} />
                        <Note text={fieldChangeNotes?.floors} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <YearPickerCard name="buildStart" label="Build Start Year" emoji="🏗️" />
                            <Note text={fieldChangeNotes?.buildStart} />
                        </div>
                        <div className="space-y-1">
                            <YearPickerCard name="buildCompleted" label="Build End Year" emoji="🏁" />
                            <Note text={fieldChangeNotes?.buildCompleted} />
                        </div>
                    </div>
                    <div className="space-y-1"><RoadAccessCard name="roadAccess" /><Note text={fieldChangeNotes?.roadAccess} /></div>
                </div>
            )}

        </section>
    );
}
