
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Form, FormControl, FormItem } from '@/components/ui/form';

const PROPERTY_TYPES = ["House", "Land", "Apartment", "Flat", "Rooms", "Shop Space"] as const;
const PRESET_LOCATIONS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"] as const;
const PAYMENT_PREFERENCES = ["Full Cash", "Mortgage Support", "Exchange"] as const;
const URGENCY_OPTIONS = ["within a month", "within 3 months", "within 6 months", "within a year", "after a year"] as const;


export type RequirementsFormValues = {
    purpose: 'Buy' | 'Rent';
    propertyType: typeof PROPERTY_TYPES[number];
    minPrice: number | undefined;
    maxPrice: number | undefined;
    location: string;
    otherLocation: string;
    paymentMethod: (typeof PAYMENT_PREFERENCES[number])[];
    requiredTime: typeof URGENCY_OPTIONS[number];
};

interface SingleSelectButtonGroupProps {
    value: string;
    onChange: (value: any) => void;
    options: readonly string[];
}
function SingleSelectButtonGroup({ value, onChange, options }: SingleSelectButtonGroupProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(option => (
                <Button
                    key={option}
                    type="button"
                    variant={value === option ? 'default' : 'outline'}
                    onClick={() => onChange(option)}
                    className="capitalize"
                >
                    {option}
                </Button>
            ))}
        </div>
    );
}

interface MultiSelectButtonGroupProps {
    value: string[];
    onChange: (value: string[]) => void;
    options: readonly string[];
}
function MultiSelectButtonGroup({ value, onChange, options }: MultiSelectButtonGroupProps) {
    const handleToggle = (option: string) => {
        const currentValues = value || [];

        // If "Full Cash" is selected, deselect everything else.
        if (option === 'Full Cash') {
            onChange(currentValues.includes('Full Cash') ? [] : ['Full Cash']);
            return;
        }

        // If another option is selected, deselect "Full Cash" and toggle the new option.
        let newValues = currentValues.filter(item => item !== 'Full Cash');
        if (newValues.includes(option)) {
            newValues = newValues.filter(item => item !== option);
        } else {
            newValues.push(option);
        }
        onChange(newValues);
    };


    return (
        <div className="flex flex-wrap gap-2">
            {options.map(option => (
                <Button
                    key={option}
                    type="button"
                    variant={(value || []).includes(option) ? 'default' : 'outline'}
                    onClick={() => handleToggle(option)}
                >
                    {option}
                </Button>
            ))}
        </div>
    );
}

interface LocationButtonGroupProps {
  value: string;
  onChange: (value: string) => void;
}
function LocationButtonGroup({ value, onChange }: LocationButtonGroupProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {PRESET_LOCATIONS.map(loc => (
                <Button
                    key={loc}
                    type="button"
                    variant={value === loc ? 'default' : 'outline'}
                    onClick={() => onChange(loc)}
                >
                    {loc}
                </Button>
            ))}
             <Button
                type="button"
                variant={!PRESET_LOCATIONS.includes(value as any) && value !== '' ? 'default' : 'outline'}
                onClick={() => onChange('')}
            >
                Other
            </Button>
        </div>
    )
}

interface UserRequirementsFormProps {
    initialRequirements: RequirementsFormValues | null;
    onSave: (data: any) => Promise<{ success: boolean; error?: string | null }>;
}

export function UserRequirementsForm({ initialRequirements, onSave }: UserRequirementsFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const form = useForm<RequirementsFormValues>({
        defaultValues: initialRequirements || {
            purpose: 'Buy',
            propertyType: 'House',
            minPrice: undefined,
            maxPrice: undefined,
            location: 'Kathmandu',
            otherLocation: '',
            paymentMethod: [],
            requiredTime: 'within 3 months',
        }
    });

    const onSubmit = (data: RequirementsFormValues) => {
        startTransition(async () => {
             const dataToSave = {
                ...data,
                propertyType: [data.propertyType], // Wrap in array to match schema
            };
            const result = await onSave(dataToSave);

            if (result.success) {
                toast({
                    title: "Requirements Saved",
                    description: "Your property preferences have been updated.",
                });
                router.push('/profile');
            } else {
                 toast({
                    variant: 'destructive',
                    title: "Save Failed",
                    description: result.error || "An unknown error occurred.",
                });
            }
        });
    };
    
    const selectedLocation = form.watch('location');
    const selectedPurpose = form.watch('purpose');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-semibold">I want to...</Label>
                         <Controller
                            name="purpose"
                            control={form.control}
                            render={({ field }) => (
                                <div className="mt-2">
                                    <SingleSelectButtonGroup value={field.value} onChange={field.onChange} options={['Buy', 'Rent']} />
                                </div>
                            )}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="font-semibold">Property Type</Label>
                         <Controller
                            name="propertyType"
                            control={form.control}
                            render={({ field }) => (
                               <div className="mt-2">
                                    <SingleSelectButtonGroup value={field.value} onChange={field.onChange} options={PROPERTY_TYPES} />
                               </div>
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Location</Label>
                        <div className="mt-2 space-y-2">
                             <Controller
                                name="location"
                                control={form.control}
                                render={({ field }) => <LocationButtonGroup value={field.value} onChange={field.onChange} />}
                            />
                            {selectedLocation === '' && (
                                <Input placeholder="Enter custom location..." {...form.register("otherLocation")} />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Budget</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <Input type="number" placeholder="Min Price" {...form.register("minPrice", { setValueAs: v => (v === "" ? undefined : parseInt(v, 10)) })} />
                            <Input type="number" placeholder="Max Price" {...form.register("maxPrice", { setValueAs: v => (v === "" ? undefined : parseInt(v, 10)) })} />
                        </div>
                    </div>
                    
                    {selectedPurpose === 'Buy' && (
                        <div className="space-y-2">
                            <Label className="font-semibold">Payment Preferences</Label>
                            <Controller
                                name="paymentMethod"
                                control={form.control}
                                render={({ field }) => (
                                <div className="mt-2">
                                        <MultiSelectButtonGroup value={field.value} onChange={field.onChange} options={PAYMENT_PREFERENCES} />
                                </div>
                                )}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="font-semibold">When are you planning to purchase if you get the property you like?</Label>
                         <Controller
                            name="requiredTime"
                            control={form.control}
                            render={({ field }) => (
                                <div className="mt-2">
                                    <SingleSelectButtonGroup value={field.value} onChange={field.onChange} options={URGENCY_OPTIONS} />
                                </div>
                            )}
                        />
                    </div>

                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.push('/profile')}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Requirements
                    </Button>
                </div>
            </form>
        </Form>
    );
}
