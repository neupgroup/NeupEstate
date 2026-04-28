"use client";

import { Control, useFieldArray } from "react-hook-form";
import {
    CreatePropertyFormValues,
    AreaUnitSchema,
    LandFacingSchema,
    LandTopographySchema,
    LandUsageSchema,
    LandZoningSchema,
    FurnishingStatusSchema,
} from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Trash2 } from "lucide-react";

interface PropertySpecificsSectionProps {
    control: Control<CreatePropertyFormValues>;
    category: string | undefined;
}

const HOUSE_TYPES = ["House", "Bungalow", "Villa", "Multiplex"];
const APARTMENT_TYPES = ["Apartment", "Penthouse", "Flat"];
const LAND_TYPES = ["Land"];
const COMMERCIAL_TYPES = ["Commercial Space", "Shop Space"];

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

function AreaField({ control }: { control: any }) {
    return (
        <div className="flex flex-col gap-2">
            <FormLabel>Total Area</FormLabel>
            <div className="flex items-center gap-2">
                <FormField control={control} name="area" render={({ field }) => (
                    <FormItem className="flex-1"><FormControl><Input type="number" placeholder="e.g., 1200" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="areaUnit" render={({ field }) => (
                    <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="w-28"><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                            <SelectContent>{AreaUnitSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>
        </div>
    );
}

function FacingField({ control }: { control: any }) {
    return (
        <FormField control={control} name="facing" render={({ field }) => (
            <FormItem>
                <FormLabel>Facing</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select facing" /></SelectTrigger></FormControl>
                    <SelectContent>{LandFacingSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )} />
    );
}

function CheckboxField({ control, name, label }: { control: any; name: any; label: string }) {
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">{label}</FormLabel>
            </FormItem>
        )} />
    );
}

export function PropertySpecificsSection({ control, category }: PropertySpecificsSectionProps) {
    const { fields: plotFields, append: appendPlot, remove: removePlot } = useFieldArray({ control, name: "plots" });
    const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control, name: "apartmentUnits" });

    const isHouse      = HOUSE_TYPES.includes(category ?? "");
    const isApartment  = APARTMENT_TYPES.includes(category ?? "");
    const isLand       = LAND_TYPES.includes(category ?? "");
    const isCommercial = COMMERCIAL_TYPES.includes(category ?? "");

    return (
        <section className="space-y-8">

            {/* ── Common: Area + Facing ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AreaField control={control} />
                <FacingField control={control} />
            </div>

            {/* ── House / Bungalow / Villa / Multiplex ── */}
            {isHouse && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <FF control={control} name="floors"          label="Total Floors"      placeholder="e.g., 3"    type="number" />
                        <FF control={control} name="buildStart"      label="Build Start Year"  placeholder="e.g., 2018" type="number" />
                        <FF control={control} name="buildCompleted"  label="Build End Year"    placeholder="e.g., 2020" type="number" />
                        <FF control={control} name="roadAccess"      label="Road Access (ft)"  placeholder="e.g., 20"   type="number" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <CheckboxField control={control} name="apartmentDetails.furnishing" label="Furnished" />
                    </div>
                </div>
            )}

            {/* ── Apartment / Penthouse / Flat ── */}
            {isApartment && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <FF control={control} name="onFloor"         label="On Floor"          placeholder="e.g., 5"    type="number" />
                        <FF control={control} name="floors"          label="Total Floors"      placeholder="e.g., 12"   type="number" />
                        <FF control={control} name="buildStart"      label="Build Start Year"  placeholder="e.g., 2018" type="number" />
                        <FF control={control} name="buildCompleted"  label="Build End Year"    placeholder="e.g., 2020" type="number" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <FormField control={control} name="apartmentDetails.furnishing" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Furnishing</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                    <SelectContent>{FurnishingStatusSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

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
                                    <div className="flex flex-col gap-2 col-span-2">
                                        <FormLabel>Area</FormLabel>
                                        <div className="flex gap-2">
                                            <FormField control={control} name={`apartmentUnits.${index}.area`} render={({ field }) => (
                                                <FormItem className="flex-1"><FormControl><Input type="number" placeholder="e.g., 800" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={control} name={`apartmentUnits.${index}.areaUnit`} render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="w-24"><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                                                        <SelectContent>{AreaUnitSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                    <FormField control={control} name={`apartmentUnits.${index}.furnishing`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Furnishing</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                <SelectContent>{FurnishingStatusSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <FF control={control} name="landDetails.frontage" label="Frontage (ft)"  placeholder="e.g., 20" type="number" />
                        <FF control={control} name="landDetails.depth"    label="Depth (ft)"     placeholder="e.g., 50" type="number" />
                        <FF control={control} name="roadAccess"           label="Road Access (ft)" placeholder="e.g., 16" type="number" />
                        <FormField control={control} name="landDetails.usage" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Usage</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>{LandUsageSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={control} name="landDetails.zoning" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Zoning</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>{LandZoningSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={control} name="landDetails.topography" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Topography</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>{LandTopographySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

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
                                    <div className="flex flex-col gap-2 col-span-2">
                                        <FormLabel>Area</FormLabel>
                                        <div className="flex gap-2">
                                            <FormField control={control} name={`plots.${index}.area`} render={({ field }) => (
                                                <FormItem className="flex-1"><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={control} name={`plots.${index}.areaUnit`} render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="w-24"><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                                                        <SelectContent>{AreaUnitSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                    <FF control={control} name={`plots.${index}.frontage`} label="Frontage (ft)" type="number" />
                                    <FF control={control} name={`plots.${index}.depth`}    label="Depth (ft)"    type="number" />
                                    <FormField control={control} name={`plots.${index}.zoning`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Zoning</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                <SelectContent>{LandZoningSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={control} name={`plots.${index}.topography`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Topography</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                <SelectContent>{LandTopographySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPlot({ id: `plot-${plotFields.length + 1}`, area: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" />Add Plot
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Commercial / Shop Space ── */}
            {isCommercial && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <FF control={control} name="floors"         label="Floor Number"      placeholder="e.g., 2"    type="number" />
                    <FF control={control} name="buildStart"     label="Build Start Year"  placeholder="e.g., 2015" type="number" />
                    <FF control={control} name="buildCompleted" label="Build End Year"    placeholder="e.g., 2017" type="number" />
                    <FF control={control} name="roadAccess"     label="Road Access (ft)"  placeholder="e.g., 30"   type="number" />
                </div>
            )}

        </section>
    );
}
