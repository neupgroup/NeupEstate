
"use client";

import { Control, useFieldArray } from "react-hook-form";
import { CreatePropertyFormValues, AreaUnitSchema, LandFacingSchema, LandTopographySchema, LandUsageSchema, LandZoningSchema } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";

interface PropertySpecificsSectionProps {
    control: Control<CreatePropertyFormValues>;
    category: CreatePropertyFormValues['category'];
}

export function PropertySpecificsSection({ control, category }: PropertySpecificsSectionProps) {
    const { fields: plotFields, append: appendPlot, remove: removePlot } = useFieldArray({ control, name: "plots" });
    const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control, name: "apartmentUnits" });

    return (
        <section className="space-y-6">
            <div className="space-y-6">

                {/* Property Details Section */}
                <h3 className="text-lg font-semibold -mb-2">Property Details</h3>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <FormLabel>Total Area</FormLabel>
                        <div className="flex items-center gap-2">
                            <FormField control={control} name="area" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="e.g., 1200" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="areaUnit" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl><SelectContent>{AreaUnitSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                    {category !== 'Land' && (
                        <div className="flex items-center gap-2">
                            <FormField control={control} name="buildStart" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Build Start Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2020" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="buildCompleted" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Build End Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 2022" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    )}
                    <FormField control={control} name="facing" render={({ field }) => (<FormItem><FormLabel>Facing</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select facing" /></SelectTrigger></FormControl><SelectContent>{LandFacingSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>

                {/* Category Specifics Section */}
                {category === 'House' && (
                    <>
                        <h3 className="text-lg font-semibold -mb-2">House Specifics</h3>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={control} name="floors" render={({ field }) => (<FormItem><FormLabel>Total Floors</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </>
                )}
                {category === 'Flat' && (
                    <>
                        <h3 className="text-lg font-semibold -mb-2">Flat Specifics</h3>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={control} name="floors" render={({ field }) => (<FormItem><FormLabel>Total Floors</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </>
                )}
                {category === 'Apartment' && (
                    <>
                        <h3 className="text-lg font-semibold -mb-2">Apartment Specifics</h3>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={control} name="onFloor" render={({ field }) => (<FormItem><FormLabel>On Floor</FormLabel><FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </>
                )}

                {/* Advanced Land Details */}
                {category === 'Land' && (
                    <>
                        <h3 className="text-lg font-semibold -mb-2">Land Specifics (Advanced)</h3>
                        <Separator />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <FormField control={control} name="landDetails.frontage" render={({ field }) => (<FormItem><FormLabel>Frontage (ft)</FormLabel><FormControl><Input type="number" placeholder="e.g., 20" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="landDetails.depth" render={({ field }) => (<FormItem><FormLabel>Depth (ft)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="landDetails.usage" render={({ field }) => (<FormItem><FormLabel>Usage</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select usage" /></SelectTrigger></FormControl><SelectContent>{LandUsageSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={control} name="landDetails.zoning" render={({ field }) => (<FormItem><FormLabel>Zoning</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select zoning" /></SelectTrigger></FormControl><SelectContent>{LandZoningSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={control} name="landDetails.topography" render={({ field }) => (<FormItem><FormLabel>Topography</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select topography" /></SelectTrigger></FormControl><SelectContent>{LandTopographySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <h4 className="text-lg font-semibold -mb-2">Plots / Sub-divisions</h4>
                        <Separator />
                        <div className="space-y-4">
                            {plotFields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-md space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Plot {index + 1}</h4>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removePlot(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={control} name={`plots.${index}.id`} render={({ field }) => (<FormItem><FormLabel>Plot ID</FormLabel><FormControl><Input placeholder="e.g., PLOT-A" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="flex flex-col gap-2">
                                            <FormLabel>Area</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <FormField control={control} name={`plots.${index}.area`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name={`plots.${index}.areaUnit`} render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl><SelectContent>{AreaUnitSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendPlot({ id: `plot-${plotFields.length + 1}`, area: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Add Plot</Button>
                        </div>
                    </>
                )}

                {/* Advanced Apartment Details */}
                {category === 'Apartment' && (
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold -mb-2">Individual Units</h4>
                        <Separator />
                        <div className="space-y-4">
                            {unitFields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Unit {index + 1}</h4>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={control} name={`apartmentUnits.${index}.id`} render={({ field }) => (<FormItem><FormLabel>Unit ID</FormLabel><FormControl><Input placeholder="e.g., Unit-101" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="flex flex-col gap-2">
                                            <FormLabel>Total Area</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <FormField control={control} name={`apartmentUnits.${index}.area`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" placeholder="e.g., 800" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name={`apartmentUnits.${index}.areaUnit`} render={({ field }) => (<FormItem><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger></FormControl><SelectContent>{AreaUnitSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            </div>
                                        </div>
                                        <FormField control={control} name={`apartmentUnits.${index}.onFloor`} render={({ field }) => (<FormItem><FormLabel>On Floor</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendUnit({ id: `unit-${unitFields.length + 1}` })}><PlusCircle className="mr-2 h-4 w-4" />Add Unit</Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
