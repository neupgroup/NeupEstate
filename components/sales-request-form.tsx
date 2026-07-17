
"use client";

import { useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSalesRequestAction } from '@/services/engagement';
import { CreateSalesRequestSchema, type CreateSalesRequestFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/core/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export function SalesRequestForm() {
    const { toast } = useToast();
    const [isSubmitting, startSubmitting] = useTransition();
    
    const form = useForm<CreateSalesRequestFormValues>({
        resolver: zodResolver(CreateSalesRequestSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            propertyLocation: "",
            propertyType: "",
            remarks: "",
        },
    });

    const onSubmit = (values: CreateSalesRequestFormValues) => {
        startSubmitting(async () => {
            const result = await createSalesRequestAction(values);
            if (result.success) {
                toast({
                    title: "Request Submitted",
                    description: "Thank you! An agent will review your sales request and get in touch.",
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
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                <FormField control={form.control} name="propertyLocation" render={({ field }) => (<FormItem><FormLabel>Property Location</FormLabel><FormControl><Input placeholder="e.g., 123 Main St, Anytown USA" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="propertyType" render={({ field }) => (<FormItem><FormLabel>Property Type</FormLabel><FormControl><Input placeholder="e.g., 3-Bedroom House, Commercial Space" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>Remarks / More Details (Optional)</FormLabel><FormControl><Textarea rows={5} placeholder="Tell us more about your property. e.g., 'Renovated in 2022, has a large backyard...'" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Sales Request
                </Button>
            </form>
        </Form>
    );
}
