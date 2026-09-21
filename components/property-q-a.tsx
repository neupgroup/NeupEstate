
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInquiryAction } from '@/services/content';
import { CreateInquirySchema, type CreateInquiryFormValues } from "@/types";
import { Card, CardContent, CardHeader } from "@neup/components/ui/card";
import { Button } from "@neup/components/ui/button";
import { Textarea } from "@neup/components/ui/textarea";
import { Input } from "@neup/components/ui/input";
import { PhoneInput } from "@neup/components/ui/phone-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@neup/core/hooks/useToast";
import { ChevronLeft, ChevronRight, Loader2, Mail, Phone, Send } from "lucide-react";
import { useSession } from "@neup/core/providers/session";
import { cn } from "@neup/core/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    agentName?: string;
    agentImage?: string;
    agentPhone?: string;
    agentEmail?: string;
    flat?: boolean;
}

export function PropertyQA({ propertyId, agentName = "Property Agent", agentImage, agentPhone, agentEmail, flat = false }: PropertyQAProps) {
    const { user } = useSession();
    const { toast } = useToast();
    const [isSubmitting, startSubmitting] = useTransition();
    const [rememberedDetails, setRememberedDetails] = useState<{ email?: string; phone?: string }>({});
    const [selectedTourDate, setSelectedTourDate] = useState<string | null>(null);
    const [customTourStartDate, setCustomTourStartDate] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [activeTab, setActiveTab] = useState<"visit" | "inquiry">("visit");
    
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

    const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);
    const formatDayLabel = (date: Date, index: number) => customTourStartDate
        ? date.toLocaleDateString("en-US", { weekday: "short" })
        : index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "short" });
    const tourDates = useMemo(() => Array.from({ length: 3 }, (_, index) => {
        const date = customTourStartDate ? new Date(`${customTourStartDate}T00:00:00`) : new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return date;
    }), [customTourStartDate]);
    const tourDateBounds = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maximum = new Date(today);
        maximum.setDate(maximum.getDate() + 30);
        return { min: formatDateKey(today), max: formatDateKey(maximum) };
    }, []);
    const calendarDays = useMemo(() => {
        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
        const start = new Date(firstDay);
        start.setDate(firstDay.getDate() - firstDay.getDay());
        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [calendarMonth]);
    const isDateInRange = (date: Date) => {
        const key = formatDateKey(date);
        return key >= tourDateBounds.min && key <= tourDateBounds.max;
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
        <Card className={cn(
            "overflow-hidden rounded-[2rem] border-border bg-card text-card-foreground shadow-[0_14px_34px_-16px_hsl(var(--foreground)/0.24),0_6px_14px_-10px_hsl(var(--foreground)/0.14)]",
            flat && "overflow-visible rounded-none border-0 bg-transparent shadow-none",
        )}>
            <CardHeader className={cn(
                "rounded-t-[2rem] bg-primary/5 p-6 pb-5 text-muted-foreground",
                flat && "rounded-none bg-transparent p-0",
            )}>
                <div className="flex items-center gap-5">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl border-2 border-white bg-white shadow-md">
                        {agentImage ? <img src={agentImage} alt={agentName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-headline text-2xl font-bold text-primary">{agentName.charAt(0)}</div>}
                    </div>
                    <div className="min-w-0"><p className="truncate font-headline text-xl font-bold text-foreground">{agentName}</p><p className="mt-1 text-base">Agent</p></div>
                </div>
                <div className="mt-7 space-y-3 text-lg">
                    {agentPhone && <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-primary"><Phone className="h-6 w-6" /></span><span>{agentPhone}</span></div>}
                    {agentEmail && <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-primary"><Mail className="h-6 w-6" /></span><span className="truncate">{agentEmail}</span></div>}
                </div>
            </CardHeader>
            <CardContent className={cn(
                "bg-card p-8 pt-4",
                flat && "bg-transparent p-0",
            )}>
                <div className="mb-4 flex rounded-full bg-muted-foreground/20 p-1 text-center text-xs font-semibold text-muted-foreground">
                    <button type="button" onClick={() => setActiveTab("visit")} className={cn("flex-1 rounded-full px-2 py-2 transition-colors", activeTab === "visit" && "bg-background text-primary shadow-sm")}>Request Visit</button>
                    <button type="button" onClick={() => setActiveTab("inquiry")} className={cn("flex-1 rounded-full px-2 py-2 transition-colors", activeTab === "inquiry" && "bg-background text-primary shadow-sm")}>Make Inquiry</button>
                </div>
                {activeTab === "visit" && <div className="mb-5">
                    <p className="mb-2 text-sm font-semibold">When</p>
                    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                        {tourDates.slice(0, 3).map((date, index) => {
                            const key = formatDateKey(date);
                            return <button key={key} type="button" onClick={() => { setSelectedTourDate(key); setShowDatePicker(false); }} className={cn("min-w-0 rounded-xl border px-1 py-2 text-center transition-colors hover:border-primary", selectedTourDate === key && "border-primary bg-primary/10 text-primary")}><span className="block text-base font-semibold">{date.getDate()}</span><span className="block truncate text-[10px] text-muted-foreground">{formatDayLabel(date, index)}</span></button>;
                        })}
                        <button type="button" onClick={() => { setCalendarMonth(new Date()); setShowDatePicker(true); }} className="min-w-0 rounded-xl border px-1 py-2 text-center text-xs font-medium transition-colors hover:border-primary">Choose another</button>
                    </div>
                </div>}
                {user && <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-primary/10">
                        {user.displayImage ? <img src={user.displayImage} alt={user.displayName ?? "User"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-semibold text-primary">{(user.displayName ?? "U").charAt(0)}</div>}
                    </div>
                    <div className="min-w-0"><p className="truncate font-semibold">{user.displayName ?? "Your details"}</p><p className="truncate text-sm text-muted-foreground">{rememberedDetails.phone || "Phone not provided"}</p></div>
                </div>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {(!user || !user.displayName) && <FormField control={form.control} name="name" render={({ field }) => (<FormItem className="w-full"><FormLabel>Name</FormLabel><FormControl><Input className="h-11 rounded-xl px-4" placeholder="Your full name" {...field} /></FormControl><FormMessage /></FormItem>)}/>} 
                        {(!user || !rememberedDetails.phone) && <FormField control={form.control} name="phone" render={({ field }) => (<FormItem className="w-full"><FormLabel>Contact number</FormLabel><FormControl><div className="relative flex w-full items-center"><div className="w-full"><PhoneInput className="h-11 rounded-xl border border-input bg-background px-4 py-2 ring-offset-background" placeholder="Phone number" value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} /></div></div></FormControl><FormMessage /></FormItem>)}/>} 
                        {(!user || !rememberedDetails.email) && <FormField control={form.control} name="email" render={({ field }) => (<FormItem className="w-full"><FormLabel>Email</FormLabel><FormControl><Input className="h-11 rounded-xl px-4" type="email" placeholder="Email address" {...field} /></FormControl><FormMessage /></FormItem>)}/>}<FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea className="min-h-16 rounded-xl px-4" placeholder="Add any visit notes" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <Button htmlType="submit" variant="solid" className="h-11 w-full rounded-full text-sm" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Submit Inquiry
                        </Button>
                    </form>
                </Form>
                {!user && <p className="mt-2 text-xs text-muted-foreground">Sign in to auto-fill your contact details.</p>}
            </CardContent>
            <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Choose another date</DialogTitle>
                        <DialogDescription>Select a preferred visit date.</DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl border p-3">
                        <div className="mb-3 flex items-center justify-between">
                            <button type="button" className="rounded-lg p-2 hover:bg-muted" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
                            <p className="font-semibold">{calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                            <button type="button" className="rounded-lg p-2 hover:bg-muted" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                        <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((date) => {
                                const key = formatDateKey(date);
                                const available = isDateInRange(date);
                                return <button key={key} type="button" disabled={!available} onClick={() => { setSelectedTourDate(key); setCustomTourStartDate(key); setShowDatePicker(false); }} className={cn("h-9 rounded-lg text-sm", date.getMonth() !== calendarMonth.getMonth() && "text-muted-foreground/40", available && "hover:bg-primary/10", selectedTourDate === key && "bg-primary text-primary-foreground", !available && "cursor-not-allowed opacity-40")}>{date.getDate()}</button>;
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
