'use client'

import { useMemo, useState } from 'react'
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { Calculator, Landmark, Percent, Wallet } from 'lucide-react'

import { cn } from '@/core/utils'
import { calculateEmiBreakdown } from '@/components/logic/EmiCalculator.v1'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientLink } from '@/components/client-link'

const currencyFormatter = new Intl.NumberFormat('en-NP', {
  style: 'currency',
  currency: 'NPR',
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-NP', {
  maximumFractionDigits: 2,
})

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))']

const parsePositiveNumber = (value: string, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

interface SummaryCardProps {
  title: string
  value: string
  description: string
  highlight?: boolean
}

function SummaryCard({ title, value, description, highlight = false }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-5 shadow-sm',
        highlight && 'border-primary/30 bg-primary/5',
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function EmiCalculatorTool() {
  const [principalInput, setPrincipalInput] = useState('7500000')
  const [interestInput, setInterestInput] = useState('10.5')
  const [termInput, setTermInput] = useState('20')

  const principal = parsePositiveNumber(principalInput, 0)
  const annualInterestRate = parsePositiveNumber(interestInput, 0)
  const termYears = parsePositiveNumber(termInput, 0)

  const result = useMemo(
    () =>
      calculateEmiBreakdown({
        principal,
        annualInterestRate,
        termYears,
      }),
    [principal, annualInterestRate, termYears],
  )

  const chartData = useMemo(
    () => [
      { name: 'Principal', value: principal },
      { name: 'Interest', value: result.totalInterest },
    ],
    [principal, result.totalInterest],
  )

  return (
    <main className="flex-1 bg-background">
      <section className="relative overflow-hidden border-b bg-slate-950 text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(8,47,73,0.86))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="container relative mx-auto px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">
              <Calculator className="h-4 w-4" />
              Finance Tool
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              EMI Calculator
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/75 sm:text-lg">
              Estimate monthly payments, total interest, and your yearly repayment path with a calculator
              tailored for property financing.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Calculate Your EMI</CardTitle>
              <CardDescription>
                Adjust the loan amount, rate, and term to see the repayment picture instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Label htmlFor="loan-amount">Loan amount</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      NPR
                    </span>
                    <Input
                      id="loan-amount"
                      type="number"
                      min="0"
                      step="100000"
                      value={principalInput}
                      onChange={(event) => setPrincipalInput(event.target.value)}
                      className="pl-14"
                    />
                  </div>
                  <Slider
                    value={[Math.min(Math.max(principal || 0, 500000), 100000000)]}
                    onValueChange={([value]) => setPrincipalInput(String(value))}
                    min={500000}
                    max={100000000}
                    step={100000}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="interest-rate">Interest rate</Label>
                  <div className="relative">
                    <Input
                      id="interest-rate"
                      type="number"
                      min="0"
                      max="30"
                      step="0.1"
                      value={interestInput}
                      onChange={(event) => setInterestInput(event.target.value)}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      %
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(Math.max(annualInterestRate || 0, 0), 30)]}
                    onValueChange={([value]) => setInterestInput(String(value))}
                    min={0}
                    max={30}
                    step={0.1}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="term-years">Term</Label>
                  <div className="relative">
                    <Input
                      id="term-years"
                      type="number"
                      min="1"
                      max="40"
                      step="1"
                      value={termInput}
                      onChange={(event) => setTermInput(event.target.value)}
                      className="pr-14"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      years
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(Math.max(termYears || 1, 1), 40)]}
                    onValueChange={([value]) => setTermInput(String(value))}
                    min={1}
                    max={40}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  title="Monthly EMI"
                  value={currencyFormatter.format(result.monthlyPayment)}
                  description="Your estimated monthly installment."
                  highlight
                />
                <SummaryCard
                  title="Total Interest"
                  value={currencyFormatter.format(result.totalInterest)}
                  description="Interest paid over the full term."
                />
                <SummaryCard
                  title="Total Payment"
                  value={currencyFormatter.format(result.totalPayment)}
                  description="Principal plus total interest."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Payment Breakdown</CardTitle>
              <CardDescription>
                Compare how much of the total cost goes to principal versus interest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mx-auto h-[320px] w-full max-w-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => currencyFormatter.format(value)}
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: 'hsl(var(--border))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {currencyFormatter.format(item.value)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    Effective interest share
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {result.totalPayment > 0
                      ? numberFormatter.format((result.totalInterest / result.totalPayment) * 100)
                      : '0'}
                    %
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    First year outflow
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {currencyFormatter.format(
                      result.yearlySchedule[0]?.totalPaid ?? result.monthlyPayment * 12,
                    )}
                  </p>
                </div>
              </div>

              <ClientLink href="/mortgage/request" className="block">
                <Button className="w-full">
                  <Landmark className="mr-2 h-4 w-4" />
                  Request Mortgage Support
                </Button>
              </ClientLink>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Yearly Amortization Table</CardTitle>
            <CardDescription>
              Review how your balance comes down over time and how interest reduces year by year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.yearlySchedule.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(row.principalPaid)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(row.interestPaid)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(row.totalPaid)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(row.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
