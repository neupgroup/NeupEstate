
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues, PropertyCategorySchema, PropertyPurposeSchema, PropertyUsageTypeSchema } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BasicDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function BasicDetailsSection({ control }: BasicDetailsSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Basic Details</CardTitle>
                <CardDescription>Enter the primary information for the property listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Modern Downtown Loft" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe the property..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="purpose"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Purpose</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                                    {PropertyPurposeSchema.options.map((option) => (
                                        <FormItem key={option}>
                                            <FormControl><RadioGroupItem value={option} id={`purpose-${option}`} className="sr-only peer" /></FormControl>
                                            <Label htmlFor={`purpose-${option}`} className={cn("flex cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-transparent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground")}>{option}</Label>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                                    {PropertyCategorySchema.options.map((option) => (
                                        <FormItem key={option}>
                                            <FormControl><RadioGroupItem value={option} id={`category-${option}`} className="sr-only peer" /></FormControl>
                                            <Label htmlFor={`category-${option}`} className={cn("flex cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-transparent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground")}>{option}</Label>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Usage Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                                    {PropertyUsageTypeSchema.options.map((option) => (
                                        <FormItem key={option}>
                                            <FormControl><RadioGroupItem value={option} id={`type-${option}`} className="sr-only peer" /></FormControl>
                                            <Label htmlFor={`type-${option}`} className={cn("flex cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-transparent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground")}>{option}</Label>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}
