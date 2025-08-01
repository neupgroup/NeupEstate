
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues, CurrencySchema, PricingBasisSchema } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PricingDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function PricingDetailsSection({ control }: PricingDetailsSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pricing Details</CardTitle>
                <CardDescription>Set the financial details for the listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={control} name="pricing.listed" render={({ field }) => (<FormItem><FormLabel>Listed Price</FormLabel><FormControl><Input type="number" placeholder="e.g., 150000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="pricing.minimum" render={({ field }) => (<FormItem><FormLabel>Minimum Price (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="pricing.maximum" render={({ field }) => (<FormItem><FormLabel>Maximum Price (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="pricing.currency" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl><SelectContent>{CurrencySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={control} name="pricing.basis" render={({ field }) => (<FormItem><FormLabel>Basis</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select basis" /></SelectTrigger></FormControl><SelectContent>{PricingBasisSchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={control} name="pricing.negotiable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1 md:col-span-3"><FormLabel>Price is Negotiable</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    <FormField control={control} name="pricing.options" render={({ field }) => (<FormItem className="col-span-1 md:col-span-3"><FormLabel>Payment Options (comma-separated)</FormLabel><FormControl><Input placeholder="e.g., cash, loan, mortgage" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </CardContent>
        </Card>
    );
}
