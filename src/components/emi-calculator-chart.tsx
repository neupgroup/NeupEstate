
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from './ui/button';
import { Banknote, FileQuestion } from 'lucide-react';
import { ClientLink } from './client-link';

interface EmiCalculatorChartProps {
  price: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export function EmiCalculatorChart({ price }: EmiCalculatorChartProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [tenureYears, setTenureYears] = useState(20);

  const { emi, totalInterest, totalPayment, loanAmount, chartData } = useMemo(() => {
    const downPaymentAmount = price * (downPaymentPercent / 100);
    const P = price - downPaymentAmount; // Principal loan amount
    const r = interestRate / 12 / 100; // Monthly interest rate
    const n = tenureYears * 12; // Tenure in months

    if (P <= 0 || r <= 0 || n <= 0) {
      return { emi: 0, totalInterest: 0, totalPayment: 0, loanAmount: 0, chartData: [] };
    }

    const emiValue = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaymentValue = emiValue * n;
    const totalInterestValue = totalPaymentValue - P;
    
    let balance = P;
    const yearlyData = [];
    for (let year = 1; year <= tenureYears; year++) {
        let yearlyInterest = 0;
        let yearlyPrincipal = 0;
        for (let month = 1; month <= 12; month++) {
            if (balance <= 0) break;
            const interestForMonth = balance * r;
            const principalForMonth = emiValue - interestForMonth;
            balance -= principalForMonth;
            yearlyInterest += interestForMonth;
            yearlyPrincipal += principalForMonth;
        }
        yearlyData.push({
            year: `${year}`,
            principal: Math.round(yearlyPrincipal),
            interest: Math.round(yearlyInterest),
        });
    }

    return {
      emi: emiValue,
      totalInterest: totalInterestValue,
      totalPayment: totalPaymentValue,
      loanAmount: P,
      chartData: yearlyData,
    };
  }, [price, downPaymentPercent, interestRate, tenureYears]);

  const chartConfig = {
    principal: {
      label: 'Principal',
      color: 'hsl(var(--primary))',
    },
    interest: {
      label: 'Interest',
      color: 'hsl(var(--accent))',
    },
  } satisfies ChartConfig;

  return (
    <div className="mt-6 border-t pt-6">
        <h2 className="text-2xl font-headline font-semibold mb-4">Mortgage Calculator</h2>
        <Card>
            <CardContent className="p-6 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <Label htmlFor="price">Total Price</Label>
                        <Input id="price" value={formatCurrency(price)} readOnly />
                    </div>
                     <div className="space-y-4">
                        <Label htmlFor="loanAmount">Loan Amount</Label>
                        <Input id="loanAmount" value={formatCurrency(loanAmount)} readOnly />
                    </div>
                     <div className="space-y-4">
                        <Label htmlFor="emi">Monthly Payment (EMI)</Label>
                        <Input id="emi" value={formatCurrency(emi)} readOnly className="text-primary font-bold text-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Down Payment</Label>
                            <span className="font-semibold">{downPaymentPercent}%</span>
                        </div>
                        <Slider
                            value={[downPaymentPercent]}
                            onValueChange={(value) => setDownPaymentPercent(value[0])}
                            min={0}
                            max={50}
                            step={1}
                        />
                    </div>
                    <div className="space-y-2">
                         <div className="flex justify-between">
                            <Label>Interest Rate</Label>
                            <span className="font-semibold">{interestRate.toFixed(2)}%</span>
                        </div>
                        <Slider
                            value={[interestRate]}
                            onValueChange={(value) => setInterestRate(value[0])}
                            min={1}
                            max={15}
                            step={0.1}
                        />
                    </div>
                    <div className="space-y-2">
                         <div className="flex justify-between">
                            <Label>Loan Tenure</Label>
                            <span className="font-semibold">{tenureYears} Years</span>
                        </div>
                        <Slider
                            value={[tenureYears]}
                            onValueChange={(value) => setTenureYears(value[0])}
                            min={5}
                            max={30}
                            step={1}
                        />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-center">Payment Breakdown</h3>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                            <p className="text-muted-foreground">Loan Amount</p>
                            <p className="font-semibold text-lg">{formatCurrency(loanAmount)}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Total Interest</p>
                            <p className="font-semibold text-lg">{formatCurrency(totalInterest)}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Total Payment</p>
                            <p className="font-semibold text-lg">{formatCurrency(totalPayment)}</p>
                        </div>
                    </div>
                </div>
                
                {chartData.length > 0 && (
                    <div className="h-[350px] w-full">
                        <ChartContainer config={chartConfig} className="w-full h-full">
                            <BarChart data={chartData} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="year"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => `Year ${value}`}
                                />
                                <YAxis
                                    tickFormatter={(value) => `$${Number(value) / 1000}K`}
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Legend />
                                <Bar dataKey="principal" stackId="a" fill="var(--color-principal)" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="interest" stackId="a" fill="var(--color-interest)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                )}
            </CardContent>
            <CardFooter className="gap-4">
                <Button variant="outline" disabled className="w-full">
                    <Banknote className="mr-2 h-4 w-4" />
                    Mortgage Availability (Soon)
                </Button>
                 <ClientLink href="/mortgage/request" className="w-full">
                     <Button variant="outline" className="w-full">
                        <FileQuestion className="mr-2 h-4 w-4" />
                        Request for Mortgage Support
                    </Button>
                </ClientLink>
            </CardFooter>
        </Card>
    </div>
  );
}
