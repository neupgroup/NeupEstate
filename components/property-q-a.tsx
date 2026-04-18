
"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { suggestPropertyQuestionsAction, createInquiryAction } from "@/app/actions";
import { CreateInquirySchema, type CreateInquiryFormValues } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// --- Cookie Helper Functions ---
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
// --- End Cookie Helper Functions ---


interface PropertyQAProps {
    propertyId: string;
}

export function PropertyQA({ propertyId }: PropertyQAProps) {
    const { toast } = useToast();
    const [isLoadingSuggestions, startLoadingSuggestions] = useTransition();
    const [isSubmitting, startSubmitting] = useTransition();
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    
    const form = useForm<CreateInquiryFormValues>({
        resolver: zodResolver(CreateInquirySchema),
        defaultValues: {
            propertyId: propertyId,
            name: "",
            email: "",
            phone: "",
            question: "",
        },
    });

    // Effect to pre-fill form from cookies
    useEffect(() => {
        try {
            const userDetailsCookie = getCookie("user_details");
            if (userDetailsCookie) {
                const userDetails = JSON.parse(userDetailsCookie);
                if (userDetails.name) form.setValue("name", userDetails.name);
                if (userDetails.email) form.setValue("email", userDetails.email);
                if (userDetails.phone) form.setValue("phone", userDetails.phone);
            }
        } catch (error) {
            console.error("Failed to parse user details from cookie:", error);
        }
    }, [form]);


    useEffect(() => {
        startLoadingSuggestions(async () => {
            const result = await suggestPropertyQuestionsAction(propertyId);
            if (result.success && result.questions) {
                setSuggestedQuestions(result.questions);
            }
        });
    }, [propertyId]);

    const handleQuestionSelect = (question: string) => {
        form.setValue("question", question);
    };

    const onSubmit = (values: CreateInquiryFormValues) => {
        startSubmitting(async () => {
            const result = await createInquiryAction(values);
            if (result.success) {
                toast({
                    title: "Inquiry Submitted",
                    description: "Thank you! An agent will get back to you shortly.",
                });

                // --- Save user details to cookie ---
                try {
                    const userDetailsCookie = getCookie("user_details");
                    const existingDetails = userDetailsCookie ? JSON.parse(userDetailsCookie) : {};
                    const userDetailsToSave = {
                        name: values.name,
                        email: values.email,
                        phone: values.phone,
                        temporary_user_id: existingDetails.temporary_user_id || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    };
                    setCookie("user_details", JSON.stringify(userDetailsToSave), 365);
                } catch (error) {
                    console.error("Failed to save user details to cookie:", error);
                }
                // --- End saving to cookie ---

                form.reset({
                    ...values, // Keep the user's details filled in
                    question: "", // But clear the question
                });
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
        <Card className="mt-6">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    Have a question?
                </CardTitle>
                <CardDescription>
                    Ask us anything about this property.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="Your Email" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone (Optional)</FormLabel><FormControl><Input placeholder="Your Phone Number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>Question</FormLabel><FormControl><Textarea placeholder="Type your question here..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Submit Inquiry
                        </Button>
                    </form>
                </Form>
                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        Suggested Questions
                    </h4>
                    {isLoadingSuggestions ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-start gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <Button
                                    key={i}
                                    type="button"
                                    variant="link"
                                    className="h-auto p-0 text-left text-sm text-primary whitespace-normal"
                                    onClick={() => handleQuestionSelect(q)}
                                >
                                    {q}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
