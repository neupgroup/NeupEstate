
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, MousePointerClick, UserPlus, FileQuestion, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon, description, isLoading }: { title: string; value?: string | number; icon: React.ReactNode; description: string; isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const chartConfig = {
  Reach: { label: "Reach", color: "hsl(var(--primary))" },
  Interactions: { label: "Interactions", color: "hsl(var(--accent))" },
  Leads: { label: "Leads", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;


export function AnalyticsDashboard() {
    const [query, setQuery] = useState('Last 30 days');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<{
        dailyData: { date: string; Reach: number; Interactions: number; Leads: number; Inquiries: number }[];
        totals: { reach: number; interactions: number; leads: number; inquiries: number };
    }>({ dailyData: [], totals: { reach: 0, interactions: 0, leads: 0, inquiries: 0 } });

    useEffect(() => {
        // Generate mock data on the client side to prevent hydration errors from Math.random()
        const dailyData = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return {
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                Reach: Math.floor(Math.random() * 500) + 200,
                Interactions: Math.floor(Math.random() * 300) + 100,
                Leads: Math.floor(Math.random() * 10) + 1,
                Inquiries: Math.floor(Math.random() * 5) + 0,
            };
        });

        const totals = dailyData.reduce((acc, day) => {
            acc.reach += day.Reach;
            acc.interactions += day.Interactions;
            acc.leads += day.Leads;
            acc.inquiries += day.Inquiries;
            return acc;
        }, { reach: 0, interactions: 0, leads: 0, inquiries: 0 });

        setAnalyticsData({ dailyData, totals });
        setIsLoading(false);
    }, []);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // In a real implementation, this would trigger an AI flow to parse the date
        // and fetch real data. For now, we show a toast message.
        toast({
            title: "Live Data Coming Soon",
            description: "The chart below is showing sample data for the last 30 days. Real-time analytics are in development.",
        });
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Analytics Dashboard</h2>
                <p className="text-sm text-muted-foreground">Review your platform's performance metrics.</p>
            </div>
            
            <div className="space-y-6">
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <Input
                        placeholder="Enter a date range (e.g., 'last week', 'January 2024')"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button type="submit">
                        <Search className="mr-2 h-4 w-4" />
                        Generate Report
                    </Button>
                </form>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title="Total Reach"
                        value={analyticsData.totals.reach.toLocaleString()}
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                        description="Total unique users reached in the period."
                        isLoading={isLoading}
                    />
                    <StatCard 
                        title="Total Interactions"
                        value={analyticsData.totals.interactions.toLocaleString()}
                        icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />}
                        description="Total clicks, saves, and shares."
                            isLoading={isLoading}
                    />
                    <StatCard 
                        title="Total Leads"
                        value={analyticsData.totals.leads.toLocaleString()}
                        icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                        description="New contacts generated in the period."
                            isLoading={isLoading}
                    />
                    <StatCard 
                        title="Total Inquiries"
                        value={analyticsData.totals.inquiries.toLocaleString()}
                        icon={<FileQuestion className="h-4 w-4 text-muted-foreground" />}
                        description="Property questions submitted."
                            isLoading={isLoading}
                    />
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Over Time</CardTitle>
                        <CardDescription>
                            Displaying mock data for "{query}"
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {isLoading ? (
                                <Skeleton className="h-full w-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                        <LineChart
                                            accessibilityLayer
                                            data={analyticsData.dailyData}
                                            margin={{
                                            left: 12,
                                            right: 12,
                                            }}
                                        >
                                            <CartesianGrid vertical={false} />
                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickFormatter={(value) => value.slice(0, 6)}
                                            />
                                            <Tooltip
                                                cursor={false}
                                                content={<ChartTooltipContent indicator="dot" />}
                                            />
                                            <Legend />
                                            <Line
                                                dataKey="Reach"
                                                type="natural"
                                                stroke="var(--color-Reach)"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Line
                                                dataKey="Interactions"
                                                type="natural"
                                                stroke="var(--color-Interactions)"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Line
                                                dataKey="Leads"
                                                type="natural"
                                                stroke="var(--color-Leads)"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ChartContainer>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
