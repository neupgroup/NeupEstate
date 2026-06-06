"use client";

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronDown, Plus, Trash2, Filter } from 'lucide-react';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createIntelligenceCriteriaAction, deleteIntelligenceCriteriaAction } from './actions';

const PURPOSE_OPTIONS = ['rent', 'sale', 'sale.auction', 'sale.exchange'] as const;
const TYPE_OPTIONS = ['house', 'land', 'apartment', 'commercial', 'other'] as const;

export function IntelligenceCriteriaClient({ criteria, competitors }: { criteria: any[]; competitors: any[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <div>
        <ClientLink href="/manage/intelligence" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to Intelligence
        </ClientLink>
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Filter className="h-6 w-6" />
          Intelligence Criteria
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the criteria that should trigger alerts for your account. Location and purpose are required.
        </p>
      </div>

      <Card className="overflow-hidden rounded-b-none">
        <button
          type="button"
          onClick={() => setIsAddOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/50"
        >
          <div>
            <CardTitle className="text-lg">Add Criteria</CardTitle>
            <CardDescription className="mt-1">
              Create multiple criteria rows. Each account can have more than one saved rule.
            </CardDescription>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isAddOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`grid transition-all duration-300 ease-out ${isAddOpen ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="border-t px-6 py-6">
            <form
              action={async (formData) => {
                await createIntelligenceCriteriaAction(formData);
                setIsAddOpen(false);
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Input name="cLocation" placeholder="Kathmandu, Lalitpur, Pokhara..." required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Purpose *</label>
                <select name="cPurpose" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select purpose</option>
                  {PURPOSE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Budget</label>
                <Input name="cMinBudget" type="number" min="0" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Budget</label>
                <Input name="cMaxBudget" type="number" min="0" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Competitor</label>
                <select name="cCompetitorId" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Any competitor</option>
                  {competitors.map((competitor) => (
                    <option key={competitor.id} value={competitor.id}>{competitor.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select name="cType" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Any type</option>
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2 pt-2">
                <Button type="submit" disabled={isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Save Criteria
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Card>

      <div className="-mt-px space-y-0">
        {criteria.length === 0 ? (
          <Card className="rounded-none first:rounded-t-lg last:rounded-b-lg">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">No criteria saved yet.</p>
            </CardContent>
          </Card>
        ) : (
          criteria.map((item) => (
            <Card
              key={item.id}
              className="rounded-none border-t-0 first:rounded-t-lg first:border-t last:rounded-b-lg"
            >
              <CardContent className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.cPurpose}</Badge>
                    {item.cType && <Badge variant="outline">{item.cType}</Badge>}
                  </div>
                  <p className="text-sm font-medium">{item.cLocation}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.cMinBudget || item.cMaxBudget
                      ? `${item.cMinBudget ? item.cMinBudget.toLocaleString() : 'Any'} - ${item.cMaxBudget ? item.cMaxBudget.toLocaleString() : 'Any'}`
                      : 'Any budget'}
                  </p>
                  {item.competitor && (
                    <p className="text-sm text-muted-foreground">Competitor: {item.competitor.name}</p>
                  )}
                </div>
                <form action={deleteIntelligenceCriteriaAction.bind(null, item.id)}>
                  <Button variant="ghost" size="icon" type="submit" aria-label="Delete criteria">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
