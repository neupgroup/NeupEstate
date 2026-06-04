
"use client";

import { useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMortgageRequestAction } from "@/app/actions";
import { CreateMortgageRequestSchema, type CreateMortgageRequestFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/logica/core/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export function MortgageRequestForm() {
    const { toast } = useToast();
    const [isSubmitting, startSubmitting] = useTransition();
    
    const form = useForm<CreateMortgageRequestFormValues>({
        resolver: zodResolver(CreateMortgageRequestSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            address: "",
            age: undefined,
            income: undefined,
            moreDetails: "",
            contactMethods: ["call"],
        },
    });

    const onSubmit = (values: CreateMortgageRequestFormValues) => {
        startSubmitting(async () => {
            const result = await createMortgageRequestAction(values);
            if (result.success) {
                toast({
                    title: "Request Submitted",
                    description: "Thank you! Our mortgage specialists will be in touch shortly.",
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
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Current Address</FormLabel><FormControl><Input placeholder="123 Main St, Anytown" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="age" render={({ field }) => (<FormItem><FormLabel>Your Age</FormLabel><FormControl><Input type="number" placeholder="e.g., 35" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="income" render={({ field }) => (<FormItem><FormLabel>Approximate Annual Income ($)</FormLabel><FormControl><Input type="number" placeholder="e.g., 75000" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
                
                <FormField control={form.control} name="moreDetails" render={({ field }) => (<FormItem><FormLabel>More Details</FormLabel><FormControl><Textarea rows={5} placeholder="Tell us about your financial situation, the type of property you are interested in, or any specific questions you have." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                
                 <FormField
                    control={form.control}
                    name="contactMethods"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Preferred Contact Methods</FormLabel>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {(['call', 'email', 'whatsapp'] as const).map((item) => (
                                <FormField
                                key={item}
                                control={form.control}
                                name="contactMethods"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={item}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(item)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...field.value, item])
                                                : field.onChange(
                                                    field.value?.filter(
                                                    (value) => value !== item
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal capitalize">
                                            {item}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Mortgage Request
                </Button>
            </form>
        </Form>
    );
}
