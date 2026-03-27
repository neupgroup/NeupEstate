
"use client";

import { Control, useFieldArray, useWatch } from "react-hook-form";
import { CreatePropertyFormValues, User } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Sub-component for phone numbers array
function PhoneInputArray({ control, ownerIndex }: { control: Control<CreatePropertyFormValues>, ownerIndex: number }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `owners.${ownerIndex}.unregisteredOwnerPhones`
    });

    return (
        <div className="space-y-2">
            <FormLabel>Phone</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="relative">
                    <FormField
                        control={control}
                        name={`owners.${ownerIndex}.unregisteredOwnerPhones.${index}.value`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl><Input placeholder="e.g., 98xxxxxxxx" {...field} className="pr-10" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Phone</Button>
        </div>
    );
}

// Sub-component for a single owner's details
function OwnerDetails({ control, index, remove, users }: { control: Control<CreatePropertyFormValues>, index: number, remove: (index: number) => void, users: User[] }) {
    const ownerType = useWatch({
        control,
        name: `owners.${index}.ownerType`
    });

    return (
        <div className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-medium">Owner {index + 1}</h4>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <FormField
                control={control}
                name={`owners.${index}.ownerType`}
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex gap-4"
                            >
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="unregistered" id={`owner-${index}-unregistered`} /></FormControl>
                                    <Label htmlFor={`owner-${index}-unregistered`}>Unregistered</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="registered" id={`owner-${index}-registered`} /></FormControl>
                                    <Label htmlFor={`owner-${index}-registered`}>Registered User</Label>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Separator />

            {ownerType === 'registered' ? (
                <FormField
                    control={control}
                    name={`owners.${index}.userId`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Select User</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a registered user" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <div className="space-y-4">
                    <FormField
                        control={control}
                        name={`owners.${index}.unregisteredOwnerName`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl><Input placeholder="Owner's full name" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`owners.${index}.unregisteredOwnerEmail`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input type="email" placeholder="Owner's email" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <PhoneInputArray control={control} ownerIndex={index} />
                    <FormField
                        control={control}
                        name={`owners.${index}.unregisteredOwnerNotes`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl><Textarea placeholder="Any notes about the owner..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </div>
    );
}

// Main component for the section
interface OwnerInfoSectionProps {
    control: Control<CreatePropertyFormValues>;
    users: User[];
    formErrors: any;
}

export function OwnerInfoSection({ control, users, formErrors }: OwnerInfoSectionProps) {
    const { fields: ownerFields, append: appendOwner, remove: removeOwner } = useFieldArray({
        control,
        name: "owners"
    });

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Owner/Authorized Person Information/s</h2>
                <p className="text-sm text-muted-foreground">Add up to 4 owners. At least one is required.</p>
                <FormMessage>{formErrors.owners?.root?.message}</FormMessage>
            </div>
            <div className="space-y-4">
                {ownerFields.map((field, index) => (
                    <OwnerDetails key={field.id} control={control} index={index} remove={removeOwner} users={users} />
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendOwner({ ownerType: 'unregistered', unregisteredOwnerName: '', unregisteredOwnerEmail: '', unregisteredOwnerPhones: [{ value: '' }], unregisteredOwnerNotes: '' })} disabled={ownerFields.length >= 4}><PlusCircle className="mr-2 h-4 w-4" />Add Owner</Button>
            </div>
        </section>
    );
}
