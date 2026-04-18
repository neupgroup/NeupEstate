
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, CheckCircle, MessageSquare, Phone, User, Info, Building } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Conversation } from "@/types";
import { RelativeTime } from "./relative-time";

interface LeadDetailsCardProps {
    lead: Conversation;
}

const leadTypes = ['Buyer', 'Seller', 'Tenant', 'Investor'];
const leadActivities = [
    { type: 'Initial Inquiry', icon: <MessageSquare/>, details: 'User sent first message about "Luxury Penthouse".', time: '2 days ago' },
    { type: 'Agent Response', icon: <User/>, details: 'AI Assistant responded with property details.', time: '2 days ago' },
    { type: 'Phone Call', icon: <Phone/>, details: 'Scheduled a call to discuss options.', time: '1 day ago' },
    { type: 'Site Visit', icon: <Building/>, details: 'Booked a visit for this Saturday at 2 PM.', time: '3 hours ago' },
    { type: 'Follow-up', icon: <CheckCircle/>, details: 'Sent follow-up email with brochure.', time: '1 hour ago' },
];


export function LeadDetailsCard({ lead }: LeadDetailsCardProps) {
    
    const leadWarmth = lead.leadScore || 5;

    const getWarmthLabel = () => {
        if (leadWarmth <= 3) return 'Cold';
        if (leadWarmth <= 7) return 'Warm';
        return 'Hot';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lead Details</CardTitle>
                <CardDescription>
                    Categorization and activity history for this lead.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Lead Type</h4>
                    <div className="flex flex-wrap gap-2">
                        {leadTypes.map(type => (
                             <Badge key={type} variant={lead.leadCategory === 'New Inquiry' && type === 'Buyer' ? 'default' : 'secondary'}>
                                {type}
                            </Badge>
                        ))}
                    </div>
                </div>

                <Separator />

                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Lead Warmth</h4>
                    <div className="flex items-center gap-4">
                        <Flame className="text-orange-500" />
                        <Slider 
                            defaultValue={[leadWarmth]} 
                            max={10} 
                            step={1} 
                            className="flex-1" 
                            disabled 
                        />
                        <Badge className="w-20 justify-center" variant={leadWarmth > 7 ? 'destructive' : leadWarmth > 3 ? 'default' : 'secondary'}>
                            {getWarmthLabel()} ({leadWarmth}/10)
                        </Badge>
                    </div>
                </div>
                
                <Separator />

                <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Activity Timeline</h4>
                    <div className="relative pl-6">
                         {/* Vertical line for the timeline */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2 ml-3"></div>
                        <ul className="space-y-6">
                            {leadActivities.map((activity, index) => (
                                <li key={index} className="relative flex items-start gap-4">
                                     <div className="absolute left-0 top-1 h-6 w-6 bg-background border-2 border-border rounded-full flex items-center justify-center -translate-x-1/2 ml-3">
                                        <div className="h-4 w-4 text-muted-foreground">{activity.icon}</div>
                                    </div>
                                    <div className="pl-6 flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-sm">{activity.type}</p>
                                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

