'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LeadType, LeadPriority } from '@prisma/client';
import { searchClients, saveClient } from '@/services/lead-service';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { SelectionCards } from '@/components/ui/selection-cards';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/logica/core/utils';
import { Search, UserPlus, ChevronRight, UserSearch, X } from 'lucide-react';
import { PriceInput } from '@/components/ui/price-input';
import { createLeadAction, getCurrentAccountId } from '@/app/actions';
import { getAccountById, getAccounts } from '@/services/account-service';
import { getAgencyAgentMapsByAgency, getAgencyAgentMapsByAgent } from '@/services/agency-agent-map-service';
import type { Account } from '@/types';
import { useToast } from '@/logica/core/hooks/use-toast';

type SearchedClient = {
    id: string;
    firstName: string;
    lastName: string;
    contact: any;
    source: string | null;
};

const clientSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName:  z.string().min(1, 'Last name is required'),
    email:     z.string().email('Invalid email').optional().or(z.literal('')),
    phone:     z.string().optional(),
    source:    z.string().optional(),
});

const requirementSchema = z.object({
    type:      z.nativeEnum(LeadType),
    priority:  z.nativeEnum(LeadPriority),
    assignedTo: z.string().optional(),
    minBudget: z.coerce.number().optional(),
    maxBudget: z.coerce.number().optional(),
    location:  z.string().optional(),
    notes:     z.string().optional(),
});

type ClientValues      = z.infer<typeof clientSchema>;
type RequirementValues = z.infer<typeof requirementSchema>;

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
    index, title, description, isActive, isUnlocked, onOpen, children,
}: {
    index: number;
    title: string;
    description: string;
    isActive: boolean;
    isUnlocked: boolean;
    onOpen: () => void;
    children: React.ReactNode;
}) {
    const bodyRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        if (!bodyRef.current) return;
        if (isActive) {
            setSettled(false);
            setHeight(bodyRef.current.scrollHeight);
        } else {
            setSettled(false);
            setHeight(0);
        }
    }, [isActive]);

    return (
        <div className="border-b border-border/40 last:border-b-0">
            <button
                type="button"
                onClick={isUnlocked ? onOpen : undefined}
                className={cn('w-full text-left py-4 px-1', isUnlocked && !isActive && 'cursor-pointer', !isUnlocked && 'cursor-default')}
            >
                <div className="flex items-baseline gap-3">
                    <span className={cn('text-lg font-semibold transition-colors shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}>
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className={cn('text-lg font-semibold transition-colors', isActive ? 'text-primary' : isUnlocked ? 'text-foreground' : 'text-muted-foreground/50')}>
                        {title}
                    </h2>
                </div>
                <p className={cn('text-sm mt-0.5 transition-colors', isActive ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
                    {description}
                </p>
                {isActive && <hr className="mt-3 border-primary" />}
            </button>

            <div
                style={settled ? undefined : { height: `${height}px` }}
                className={cn('overflow-hidden', !settled && 'transition-[height] duration-500 ease-in-out')}
                onTransitionEnd={() => { if (isActive) setSettled(true); }}
            >
                <div ref={bodyRef} className="px-1 pb-6">
                    <div className={cn('transition-opacity duration-300', isActive ? 'opacity-100' : 'opacity-0')}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CreateLeadForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [active, setActive]           = useState(0);
    const [unlocked, setUnlocked]       = useState(0);
    const [query, setQuery]             = useState('');
    const [results, setResults]         = useState<SearchedClient[]>([]);
    const [searched, setSearched]       = useState(false);
    const [selectedClient, setSelectedClient] = useState<SearchedClient | null>(null);
    const [savedClientId, setSavedClientId]   = useState<string | null>(null);
    const [isNewClient, setIsNewClient] = useState(false);
    const [submitting, setSubmitting]   = useState(false);
    const [isPending, startTransition]  = useTransition();
    const [agencyName, setAgencyName] = useState<string | null>(null);
    const [assignedToSearch, setAssignedToSearch] = useState('');
    const [agencyAgents, setAgencyAgents] = useState<Account[]>([]);
    const [hasAgencyContext, setHasAgencyContext] = useState(false);
    const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

    const clientForm = useForm<ClientValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: { firstName: '', lastName: '', email: '', phone: '', source: '' },
    });

    const reqForm = useForm<RequirementValues>({
        resolver: zodResolver(requirementSchema),
        defaultValues: { type: LeadType.BUYER, priority: LeadPriority.MEDIUM },
    });

    const selectedType     = reqForm.watch('type');
    const selectedPriority = reqForm.watch('priority');

    useEffect(() => {
        let cancelled = false;

        async function loadAgencyOwners() {
            const currentAccountId = await getCurrentAccountId();
            if (!currentAccountId) return;
            if (!cancelled) setCurrentAccountId(currentAccountId);

            const currentAccount = await getAccountById(currentAccountId);
            if (!currentAccount) return;

            const agencyId = currentAccount.account_type === 'brand'
                ? currentAccountId
                : currentAccount.agency ?? (await getAgencyAgentMapsByAgent(currentAccountId)).find((link) => link.status === 'accepted')?.agencyId ?? null;

            if (!agencyId) {
                if (!cancelled) {
                    setAgencyName(null);
                    setAgencyAgents([]);
                    setHasAgencyContext(false);
                }
                return;
            }

            const [agencyAccount, agencyLinks, accounts] = await Promise.all([
                getAccountById(agencyId),
                getAgencyAgentMapsByAgency(agencyId),
                getAccounts(),
            ]);

            const allowedAgentIds = new Set(
                agencyLinks
                    .filter((link) => link.status === 'accepted')
                    .map((link) => link.agentId),
            );

            const agents = accounts.filter((account) => allowedAgentIds.has(account.id) && account.account_type !== 'brand');

            if (!cancelled) {
                setAgencyName(agencyAccount?.display_name ?? agencyId);
                setAgencyAgents(agents);
                setHasAgencyContext(true);
            }
        }

        loadAgencyOwners();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredLeadOwners = useMemo(() => {
        const q = assignedToSearch.trim().toLowerCase();
        if (!q) return agencyAgents;
        return agencyAgents.filter((account) => {
            const haystack = [
                account.id,
                account.display_name ?? '',
                account.display_image ?? '',
                account.account_type,
            ].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [agencyAgents, assignedToSearch]);

    function advance(to: number) {
        setActive(to);
        setUnlocked(prev => Math.max(prev, to));
    }

    // Step 0 — search
    function handleSearch() {
        if (!query.trim()) return;
        startTransition(async () => {
            const found = await searchClients(query.trim());
            setResults(found as SearchedClient[]);
            setSearched(true);
            advance(1);
        });
    }

    function chooseNewClient() {
        setSelectedClient(null);
        setIsNewClient(true);
        clientForm.reset({ firstName: '', lastName: '', email: '', phone: '', source: '' });
        advance(2);
    }

    // Step 1 — pick client
    function pickClient(c: SearchedClient) {
        setSelectedClient(c);
        setIsNewClient(false);
        advance(2);
    }

    // Step 2 — confirm / new client form
    async function onClientConfirm(data: ClientValues) {
        if (isNewClient && !savedClientId) {
            startTransition(async () => {
                try {
                    const id = await saveClient(data);
                    setSavedClientId(id);
                } catch { /* createLead will handle it */ }
                advance(3);
            });
        } else {
            advance(3);
        }
    }

    // Step 3 — requirements
    async function onRequirementSubmit(data: RequirementValues) {
        setSubmitting(true);
        try {
            const clientData = clientForm.getValues();
            const assignedTo = data.assignedTo?.trim() || currentAccountId || undefined;
            const result = await createLeadAction({
                ...clientData,
                existingClientId: selectedClient?.id ?? savedClientId ?? undefined,
                type:        data.type,
                priority:    data.priority,
                assignedTo,
                requirement: { minBudget: data.minBudget, maxBudget: data.maxBudget, location: data.location, notes: data.notes },
            });
            if (!result.success) {
                toast({
                    variant: 'destructive',
                    title: 'Unable to create lead',
                    description: result.error || 'Please review the lead owner selection.',
                });
                setSubmitting(false);
                return;
            }
            router.push('/manage/leads/shared');
        } catch {
            toast({
                variant: 'destructive',
                title: 'Unable to create lead',
                description: 'An unexpected error occurred while creating the lead.',
            });
            setSubmitting(false);
        }
    }

    const sections = [
        {
            title: 'Search Client',
            description: 'Search by name, phone or email to find an existing client.',
        },
        {
            title: 'Select Client',
            description: searched
                ? results.length > 0 ? `${results.length} client${results.length > 1 ? 's' : ''} found.` : 'No clients found.'
                : 'Results will appear here.',
        },
        {
            title: isNewClient ? 'New Client Details' : 'Confirm Client',
            description: isNewClient ? 'Fill in the client\'s details.' : 'Review the selected client.',
        },
        {
            title: 'Requirements',
            description: 'Set the lead type, priority and requirements.',
        },
    ];

    return (
        <div className="space-y-1">
            {sections.slice(0, unlocked + 1).map((s, i) => (
                <Section
                    key={i}
                    index={i}
                    title={s.title}
                    description={s.description}
                    isActive={active === i}
                    isUnlocked={i <= unlocked}
                    onOpen={() => setActive(i)}
                >
                    {/* ── 0: Search ── */}
                    {i === 0 && (
                        <div className="space-y-3 mt-2">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Name, phone or email..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    autoFocus={active === 0}
                                />
                                <Button type="button" onClick={handleSearch} disabled={isPending || !query.trim()}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── 1: Results ── */}
                    {i === 1 && (
                        <div className="space-y-2 mt-2">
                            {results.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => pickClient(c)}
                                    className={cn(
                                        'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                                        selectedClient?.id === c.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary hover:bg-primary/5'
                                    )}
                                >
                                    <div>
                                        <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {[c.contact?.phone, c.contact?.email].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                </button>
                            ))}
                            {results.length === 0 && searched && (
                                <p className="text-sm text-muted-foreground py-2">No clients matched. Create a new one below.</p>
                            )}
                            <Button type="button" variant="outline" className="w-full mt-1" onClick={chooseNewClient}>
                                <UserPlus className="h-4 w-4 mr-2" /> Create New Client
                            </Button>
                        </div>
                    )}

                    {/* ── 2: Confirm / new client ── */}
                    {i === 2 && (
                        isNewClient ? (
                            <Form {...clientForm}>
                                <form onSubmit={clientForm.handleSubmit(onClientConfirm)} className="space-y-4 mt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={clientForm.control} name="firstName" render={({ field }) => (
                                            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={clientForm.control} name="lastName" render={({ field }) => (
                                            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={clientForm.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={clientForm.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>Phone</FormLabel><FormControl><PhoneInput placeholder="np 98XXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={clientForm.control} name="source" render={({ field }) => (
                                        <FormItem><FormLabel>Source <span className="text-muted-foreground text-xs">(optional)</span></FormLabel><FormControl><Input placeholder="e.g. Referral, Facebook" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="submit" disabled={isPending} className="w-full">
                                        {isPending ? 'Saving...' : 'Continue'}
                                    </Button>
                                </form>
                            </Form>
                        ) : selectedClient ? (
                            <div className="space-y-4 mt-2">
                                <div className="rounded-lg border divide-y overflow-hidden">
                                    {[
                                        { label: 'Name',   value: `${selectedClient.firstName} ${selectedClient.lastName}` },
                                        { label: 'Email',  value: selectedClient.contact?.email || '—' },
                                        { label: 'Phone',  value: selectedClient.contact?.phone || '—' },
                                        { label: 'Source', value: selectedClient.source || '—' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center px-4 py-2.5 gap-4">
                                            <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
                                            <span className="text-sm font-medium">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={chooseNewClient}>Not this client</Button>
                                    <Button type="button" className="flex-1" onClick={() => advance(3)}>Continue</Button>
                                </div>
                            </div>
                        ) : null
                    )}

                    {/* ── 3: Requirements ── */}
                    {i === 3 && (
                        <Form {...reqForm}>
                            <form onSubmit={reqForm.handleSubmit(onRequirementSubmit)} className="space-y-5 mt-2">
                                <FormField control={reqForm.control} name="type" render={() => (
                                    <FormItem>
                                        <FormLabel>Lead Type</FormLabel>
                                        <SelectionCards options={Object.values(LeadType)} selected={[selectedType]} onToggle={(v) => reqForm.setValue('type', v as LeadType, { shouldValidate: true })} />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={reqForm.control} name="priority" render={() => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <SelectionCards options={Object.values(LeadPriority)} selected={[selectedPriority]} onToggle={(v) => reqForm.setValue('priority', v as LeadPriority, { shouldValidate: true })} />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={reqForm.control} name="minBudget" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Min Budget</FormLabel>
                                            <FormControl>
                                                <PriceInput
                                                    placeholder="e.g. 5000000"
                                                    value={field.value?.toString() ?? ''}
                                                    onChange={(raw) => field.onChange(raw ? Number(raw) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={reqForm.control} name="maxBudget" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max Budget</FormLabel>
                                            <FormControl>
                                                <PriceInput
                                                    placeholder="e.g. 20000000"
                                                    value={field.value?.toString() ?? ''}
                                                    onChange={(raw) => field.onChange(raw ? Number(raw) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={reqForm.control} name="location" render={({ field }) => (
                                    <FormItem><FormLabel>Preferred Location <span className="text-muted-foreground text-xs">(optional)</span></FormLabel><FormControl><Input placeholder="e.g. Kathmandu, Lalitpur" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                {hasAgencyContext && agencyAgents.length > 0 && (
                                  <FormField control={reqForm.control} name="assignedTo" render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Assigned To <span className="text-muted-foreground text-xs">(agency agents)</span></FormLabel>
                                          <FormControl>
                                              <div className="space-y-3">
                                                  <div className="relative">
                                                      <UserSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                      <Input
                                                          value={assignedToSearch}
                                                          onChange={(event) => {
                                                              setAssignedToSearch(event.target.value);
                                                              field.onChange('');
                                                          }}
                                                          placeholder={agencyName ? `Search agents in ${agencyName}` : 'Search agents in your agency'}
                                                          className="pl-9"
                                                      />
                                                  </div>

                                                  {field.value && (
                                                      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                                                          <div className="min-w-0">
                                                              <p className="text-sm font-medium">
                                                                  {agencyAgents.find((agent) => agent.id === field.value)?.display_name ?? field.value}
                                                              </p>
                                                              <p className="truncate text-xs text-muted-foreground">
                                                                  Selected assignee
                                                              </p>
                                                          </div>
                                                          <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="sm"
                                                              onClick={() => {
                                                                  field.onChange('');
                                                                  setAssignedToSearch('');
                                                              }}
                                                          >
                                                              <X className="mr-2 h-4 w-4" />
                                                              Clear
                                                          </Button>
                                                      </div>
                                                  )}

                                                  {assignedToSearch.trim() && (
                                                      <div className="space-y-2 rounded-lg border bg-card p-3">
                                                          {filteredLeadOwners.length > 0 ? (
                                                              filteredLeadOwners.map((agent) => (
                                                                  <button
                                                                      key={agent.id}
                                                                      type="button"
                                                                      onClick={() => {
                                                                          field.onChange(agent.id);
                                                                          setAssignedToSearch(agent.display_name ?? agent.id);
                                                                      }}
                                                                      className={cn(
                                                                          'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5',
                                                                          field.value === agent.id ? 'border-primary bg-primary/10' : 'border-border bg-background',
                                                                      )}
                                                                  >
                                                                      <div className="min-w-0">
                                                                          <p className="truncate text-sm font-medium">{agent.display_name || agent.id}</p>
                                                                          <p className="truncate text-xs text-muted-foreground">{agent.id}</p>
                                                                      </div>
                                                                      <Badge variant={field.value === agent.id ? 'default' : 'outline'}>
                                                                          {field.value === agent.id ? 'Selected' : 'Use'}
                                                                      </Badge>
                                                                  </button>
                                                              ))
                                                          ) : (
                                                              <p className="text-sm text-muted-foreground">
                                                                  No agents matched your agency search.
                                                              </p>
                                                          )}
                                                      </div>
                                                  )}
                                              </div>
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )} />
                                )}
                                {!hasAgencyContext && (
                                  <p className="text-sm text-muted-foreground">
                                    This account is not linked to an agency, so the lead will be assigned automatically to your account.
                                  </p>
                                )}
                                {hasAgencyContext && agencyAgents.length === 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    No accepted agency agents are available yet, so the lead will be assigned automatically to your account.
                                  </p>
                                )}
                                <FormField control={reqForm.control} name="notes" render={({ field }) => (
                                    <FormItem><FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel><FormControl><Input placeholder="Any additional context" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="submit" disabled={submitting} className="w-full">
                                    {submitting ? 'Creating...' : 'Create Lead'}
                                </Button>
                            </form>
                        </Form>
                    )}
                </Section>
            ))}
        </div>
    );
}
