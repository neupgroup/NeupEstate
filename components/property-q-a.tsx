
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { suggestPropertyQuestionsAction, createInquiryAction } from '@/services/content';
import { CreateInquirySchema, type CreateInquiryFormValues } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@neup/components/ui/card";
import { Button } from "@neup/components/ui/button";
import { Textarea } from "@neup/components/ui/textarea";
import { Input } from "@neup/components/ui/input";
import { PhoneInput } from "@neup/components/ui/phone-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@neup/core/hooks/useToast";
import { CalendarDays, Check, Lightbulb, Loader2, Mail, Phone, Send } from "lucide-react";
import { Skeleton } from "@neup/components/ui/skeleton";
import { useSession } from "@neup/core/providers/session";
import { cn } from "@neup/core/utils";

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
    const { user } = useSession();
    const { toast } = useToast();
    const [isLoadingSuggestions, startLoadingSuggestions] = useTransition();
    const [isSubmitting, startSubmitting] = useTransition();
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [rememberedDetails, setRememberedDetails] = useState<{ email?: string; phone?: string }>({});
    const [selectedTourDate, setSelectedTourDate] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    
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
                window.setTimeout(() => setRememberedDetails({ email: userDetails.email, phone: userDetails.phone }), 0);
                if (userDetails.name) form.setValue("name", userDetails.name);
                if (userDetails.email) form.setValue("email", userDetails.email);
                if (userDetails.phone) form.setValue("phone", userDetails.phone);
            }
        } catch (error) {
            console.error("Failed to parse user details from cookie:", error);
        }
    }, [form]);


    useEffect(() => {
        if (!user) return;
        form.setValue("name", user.displayName ?? "");
        try {
            const details = JSON.parse(getCookie("user_details") ?? "{}");
            window.setTimeout(() => setRememberedDetails({ email: details.email, phone: details.phone }), 0);
            if (details.email) form.setValue("email", details.email);
            if (details.phone) form.setValue("phone", details.phone);
        } catch {
            // Ignore malformed remembered details.
        }
    }, [form, user]);

    useEffect(() => {
        startLoadingSuggestions(async () => {
            const result = await suggestPropertyQuestionsAction(propertyId);
            if (result.success && result.questions) {
                setSuggestedQuestions(result.questions);
            }
        });
    }, [propertyId]);

    const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);
    const formatDayLabel = (date: Date, index: number) => index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "short" });
    const tourDates = useMemo(() => Array.from({ length: 5 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return date;
    }), []);
    const tourDateBounds = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maximum = new Date(today);
        maximum.setDate(maximum.getDate() + 30);
        return { min: formatDateKey(today), max: formatDateKey(maximum) };
    }, []);

    const handleQuestionSelect = (question: string) => {
        form.setValue("question", question);
    };

    const onSubmit = (values: CreateInquiryFormValues) => {
        startSubmitting(async () => {
            const result = await createInquiryAction(values);
            if (result.success) {
                toast({ name: "default",
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
                toast({ name: "default",
                    type: "solid", convey: "danger",
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
                    {user ? "Your details are ready. Ask us anything about this property." : "Ask us anything about this property."}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                {user && <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-primary/10">
                        {user.displayImage ? <img src={user.displayImage} alt={user.displayName ?? "User"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-semibold text-primary">{(user.displayName ?? "U").charAt(0)}</div>}
                    </div>
                    <div className="min-w-0"><p className="truncate font-semibold">{user.displayName ?? "Your details"}</p><p className="truncate text-sm text-muted-foreground">{rememberedDetails.phone || "Phone not provided"}</p></div>
                </div>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {(!user || !user.displayName) && <FormField control={form.control} name="name" render={({ field }) => (<FormItem className="w-full"><FormLabel>Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormMessage /></FormItem>)}/>} 
                        {(!user || !rememberedDetails.email) && <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="w-full"><FormControl><Input type="email" preIcon={<Mail className="h-4 w-4" />} placeholder="Your Email" {...field} /></FormControl><FormMessage /></FormItem>)}/>} 
                        {(!user || !rememberedDetails.phone) && <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="w-full"><FormControl><div className="relative flex w-full items-center"><Phone className="pointer-events-none absolute left-3 z-10 h-4 w-4 text-muted-foreground" /><div className="w-full"><PhoneInput className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 ring-offset-background transition-[border-color,box-shadow,background-color,color] duration-500 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2" placeholder="+countryCode Phone" value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} /></div></div></FormControl><FormMessage /></FormItem>)}/>}<FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormControl><Textarea placeholder="Type your question here..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <Button htmlType="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Submit Inquiry
                        </Button>
                    </form>
                </Form>
                {!user && <p className="mt-2 text-xs text-muted-foreground">Sign in to auto-fill your contact details.</p>}
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
                                    htmlType="button"
                                    variant="text"
                                    alignment="left"
                                    className="h-auto min-h-10 w-full max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]"
                                    onClick={() => handleQuestionSelect(q)}
                                >
                                    {q}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 border-t pt-6">
                    <div className="mb-4 flex items-start gap-3">
                        <CalendarDays className="mt-1 h-5 w-5 text-primary" />
                        <div>
                            <h3 className="text-lg font-semibold">Schedule a tour</h3>
                            <p className="text-sm text-muted-foreground">Choose your preferred date.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {tourDates.map((date, index) => {
                            const key = formatDateKey(date);
                            return <button key={key} type="button" onClick={() => { setSelectedTourDate(key); setShowDatePicker(false); }} className={cn("rounded-md border px-2 py-3 text-center transition-colors hover:border-primary", selectedTourDate === key && "border-primary bg-primary/10 text-primary")}><span className="block text-xl font-semibold">{date.getDate()}</span><span className="text-xs text-muted-foreground">{formatDayLabel(date, index)}</span>{selectedTourDate === key && <Check className="mx-auto mt-1 h-4 w-4" />}</button>;
                        })}
                        <button type="button" onClick={() => setShowDatePicker((value) => !value)} className={cn("rounded-md border px-2 py-3 text-center text-sm font-medium transition-colors hover:border-primary", showDatePicker && "border-primary bg-primary/10 text-primary")}>
                            Choose another
                        </button>
                    </div>
                    {showDatePicker && <Input type="date" className="mt-3" min={tourDateBounds.min} max={tourDateBounds.max} onChange={(event) => setSelectedTourDate(event.target.value)} />}
                    <Button type="button" disabled={!selectedTourDate} className="mt-4 w-full" onClick={() => toast({ name: "default", title: "Tour request ready", description: `We'll help arrange your tour for ${selectedTourDate}.` })}>Book a Tour</Button>
                </div>
            </CardContent>
        </Card>
    );
}
