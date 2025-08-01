"use client";

import { useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateNewsletterSubscriptionSchema, type CreateNewsletterSubscriptionFormValues } from "@/types";
import { createNewsletterSubscriptionAction } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

export function NewsletterSubscriptionForm() {
    const { toast } = useToast();
    const [isSubmitting, startSubmitting] = useTransition();
    
    const form = useForm<CreateNewsletterSubscriptionFormValues>({
        resolver: zodResolver(CreateNewsletterSubscriptionSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = (values: CreateNewsletterSubscriptionFormValues) => {
        startSubmitting(async () => {
            const result = await createNewsletterSubscriptionAction(values);
            if (result.success) {
                toast({
                    title: "Subscribed!",
                    description: "Thanks for joining our newsletter.",
                });
                form.reset();
            } else {
                toast({
                    variant: "destructive",
                    title: "Subscription Failed",
                    description: result.error,
                });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md mx-auto">
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="pl-10 h-12"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-left" />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
