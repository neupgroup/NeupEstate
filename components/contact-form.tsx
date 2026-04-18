
"use client";

import { useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContactSubmissionAction } from "@/app/actions";
import { CreateContactSubmissionSchema, type CreateContactSubmissionFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export function ContactForm() {
    const { toast } = useToast();
    const [isSubmitting, startSubmitting] = useTransition();
    
    const form = useForm<CreateContactSubmissionFormValues>({
        resolver: zodResolver(CreateContactSubmissionSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            subject: "General Inquiry",
            body: "",
        },
    });

    const onSubmit = (values: CreateContactSubmissionFormValues) => {
        startSubmitting(async () => {
            const result = await createContactSubmissionAction(values);
            if (result.success) {
                toast({
                    title: "Message Sent",
                    description: "Thank you for contacting us. We'll be in touch shortly.",
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
                </div>
                 <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input placeholder="(123) 456-7890" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                 <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="Subject of your message" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="body" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={5} placeholder="Type your message here..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Message
                </Button>
            </form>
        </Form>
    );
}
