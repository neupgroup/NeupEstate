

"use client";

import { useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPropertyRequestAction } from "@/app/actions";
import { CreatePropertyRequestSchema, type CreatePropertyRequestFormValues, PropertyCategorySchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/core/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export function PropertyRequestForm() {
    const { toast } = useToast();
    const [isSubmitting, startSubmitting] = useTransition();
    
    const form = useForm<CreatePropertyRequestFormValues>({
        resolver: zodResolver(CreatePropertyRequestSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            location: "",
            bedrooms: undefined,
            bathrooms: undefined,
            budget: undefined,
            remarks: "",
        },
    });

    const onSubmit = (values: CreatePropertyRequestFormValues) => {
        startSubmitting(async () => {
            const result = await createPropertyRequestAction(values);
            if (result.success) {
                toast({
                    title: "Request Submitted",
                    description: "Thank you! An agent will review your request and get in touch.",
                });
                form.reset();
            } else {
                toast({
                    variant: "destructive",
                    title: "Submission Failed",
                    description: result.error,
                });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input placeholder="Your phone number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Preferred Location (Optional)</FormLabel><FormControl><Input placeholder="e.g., Downtown, Brooklyn" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="propertyType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Property Type (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Any Type" /></SelectTrigger></FormControl>
                                <SelectContent>{PropertyCategorySchema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="budget" render={({ field }) => (<FormItem><FormLabel>Max Budget (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 500000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     <FormField control={form.control} name="bedrooms" render={({ field }) => (<FormItem><FormLabel>Min. Bedrooms (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 3" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="bathrooms" render={({ field }) => (<FormItem><FormLabel>Min. Bathrooms (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>More Details / Remarks (Optional)</FormLabel><FormControl><Textarea rows={5} placeholder="Tell us more about what you're looking for. e.g., 'Must have a backyard for a dog', 'Close to public transportation', etc." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Request
                </Button>
            </form>
        </Form>
    );
}
