
"use client";

import { useEffect, useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { analyzeMarketAction, type MarketAnalysisState } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Calculator, BarChartBig, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const initialState: MarketAnalysisState = {
    success: false,
};

function AnalyzeSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                </>
            ) : (
                <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Analyze Market
                </>
            )}
        </Button>
    );
}

export function MarketAnalysis() {
    const [state, formAction] = useActionState(analyzeMarketAction, initialState);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI-Powered Market Rate Finder</CardTitle>
                <CardDescription>
                    Describe the type of property you want to analyze, and the AI will determine the market rate.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="query">Property Description</Label>
                        <Textarea
                            id="query"
                            name="query"
                            placeholder="e.g., '3 bedroom house in Austin, TX under 1500 sqft'"
                        />
                    </div>
                    <div className="pt-2">
                        <AnalyzeSubmitButton />
                    </div>
                </form>

                <div className="mt-6">
                    {state.error && (
                         <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Analysis Error</AlertTitle>
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}
                    {state.success && state.result && (
                         <Alert variant="default">
                            <BarChartBig className="h-4 w-4" />
                            <AlertTitle>Market Analysis Result</AlertTitle>
                            <AlertDescription>
                                <p className="font-semibold">{state.result.summary}</p>
                                {state.result.count > 0 && (
                                    <div className="mt-2 text-xs grid grid-cols-3 gap-2">
                                        <div>
                                            <p className="text-muted-foreground">Avg. Price</p>
                                            {isClient ? <p>{formatCurrency(state.result.averagePrice)}</p> : <Skeleton className="h-4 w-20" />}
                                        </div>
                                         <div>
                                            <p className="text-muted-foreground">Min. Price</p>
                                            {isClient ? <p>{formatCurrency(state.result.minPrice)}</p> : <Skeleton className="h-4 w-20" />}
                                        </div>
                                         <div>
                                            <p className="text-muted-foreground">Max. Price</p>
                                            {isClient ? <p>{formatCurrency(state.result.maxPrice)}</p> : <Skeleton className="h-4 w-20" />}
                                        </div>
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
