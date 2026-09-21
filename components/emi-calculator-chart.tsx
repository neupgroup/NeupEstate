'use client';

import { useMemo, useState } from 'react';
import { Calculator, Landmark } from 'lucide-react';
import { Card, CardContent } from '@neup/components/ui/card';
import { Button } from '@neup/components/ui/button';
import { Label } from '@neup/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ClientLink } from './client-link';
import { calculateEmiBreakdown } from '@/components/logic/EmiCalculator.v1';

interface EmiCalculatorChartProps {
  price: number;
  currency?: string;
}

const formatCurrency = (value: number, currency: string) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(value);

export function EmiCalculatorChart({ price, currency = 'USD' }: EmiCalculatorChartProps) {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [termYears, setTermYears] = useState(20);
  const discountedAmount = price * (1 - discountPercent / 100);
  const downPaymentAmount = discountedAmount * downPaymentPercent / 100;
  const loanAmount = discountedAmount - downPaymentAmount;
  const result = useMemo(() => calculateEmiBreakdown({
    principal: loanAmount, annualInterestRate: interestRate, termYears,
  }), [loanAmount, interestRate, termYears]);

  return (
    <section className="mt-6 border-t pt-6">
      <div className="mb-4 flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><h2 className="text-2xl font-headline font-semibold">Mortgage Calculator</h2></div>
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardContent className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:p-8">
          <div className="space-y-8">
            <div><div className="mb-3 flex items-baseline justify-between gap-4"><Label>Total amount</Label><span className="text-xl font-bold sm:text-2xl">{formatCurrency(price, currency)}</span></div><p className="text-sm text-muted-foreground">The full listed price of this property.</p></div>
            <div><div className="mb-3 flex items-baseline justify-between gap-4"><Label>Discounted amount</Label><span className="text-xl font-bold sm:text-2xl">{formatCurrency(discountedAmount, currency)}</span></div><Slider value={[discountPercent]} onValueChange={([value]) => setDiscountPercent(value)} min={0} max={50} step={1} aria-label="Discount" /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>No discount</span><span>50% discount</span></div><p className="mt-2 text-sm text-muted-foreground">Apply a discount to the total property amount.</p></div>
            <div><div className="mb-3 flex items-baseline justify-between gap-4"><Label>Down payment</Label><span className="text-xl font-bold">{formatCurrency(downPaymentAmount, currency)} ({downPaymentPercent}%)</span></div><Slider value={[downPaymentPercent]} onValueChange={([value]) => setDownPaymentPercent(value)} min={0} max={90} step={1} aria-label="Down payment" /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>0%</span><span>90%</span></div></div>
            <div><div className="mb-3 flex items-baseline justify-between gap-4"><Label>Loan amount</Label><span className="text-xl font-bold sm:text-2xl">{formatCurrency(loanAmount, currency)}</span></div><p className="text-sm text-muted-foreground">The amount financed after the down payment.</p></div>
            <div><div className="mb-3 flex items-baseline justify-between gap-4"><Label>Interest rate</Label><span className="text-xl font-bold">{interestRate.toFixed(1)}%</span></div><Slider value={[interestRate]} onValueChange={([value]) => setInterestRate(value)} min={1} max={15} step={0.1} aria-label="Interest rate" /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>1%</span><span>15%</span></div></div>
            <div><div className="mb-3 flex items-baseline justify-between gap-4"><Label>Loan period</Label><span className="text-xl font-bold">{termYears} years</span></div><Slider value={[termYears]} onValueChange={([value]) => setTermYears(value)} min={5} max={40} step={1} aria-label="Loan period" /><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>5 years</span><span>40 years</span></div></div>
          </div>
          <div className="flex flex-col rounded-2xl bg-primary/5 p-6 sm:p-7"><p className="text-lg font-semibold">Monthly payment</p><p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{formatCurrency(result.monthlyPayment, currency)}</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">This is an approximate monthly repayment based on the inputs above.</p><div className="my-6 border-t border-border/70" /><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">Total interest paid</p><p className="mt-1 text-sm text-muted-foreground">Over the full loan period.</p></div><p className="font-semibold">{formatCurrency(result.totalInterest, currency)}</p></div><div className="mt-auto pt-8"><p className="text-2xl font-bold">Ready to get started?</p><p className="mt-2 text-sm text-muted-foreground">Get in touch with our mortgage advisors for personalized advice.</p><ClientLink href="/mortgage/request" className="mt-5 block"><Button className="w-full"><Landmark className="mr-2 h-4 w-4" />Request Mortgage Support</Button></ClientLink></div></div>
        </CardContent>
      </Card>
    </section>
  );
}
