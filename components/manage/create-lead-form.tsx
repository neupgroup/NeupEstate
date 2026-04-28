'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LeadType, LeadPriority } from '@prisma/client';
import { searchClients, createLead, saveClient } from '@/services/lead-service';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectionCards } from '@/components/ui/selection-cards';
import { cn } from '@/lib/utils';
import { Search, UserPlus, Check, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchedClient = {
    id: string;
    firstName: string;
    lastName: string;
    contact: any;
    source: string | null;
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

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
    leadOwner: z.string().optional(),
    minBudget: z.coerce.number().optional(),
    maxBudget: z.coerce.number().optional(),
    location:  z.string().optional(),
    notes:     z.string().optional(),
});

type ClientValues      = z.infer<typeof clientSchema>;
type RequirementValues = z.infer<typeof requirementSchema>;

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ['Search', 'Select Client', 'Confirm Details', 'Requirements'];

function Steps({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 mb-8 flex-wrap gap-y-3">
            {STEP_LABELS.map((label, i) => (
                <div key={i} className="flex items-center">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors shrink-0',
                            i < current   ? 'bg-primary text-primary-foreground' :
                            i === current ? 'border-2 border-primary text-primary' :
                                            'border-2 border-border text-muted-foreground'
                        )}>
                            {i < current ? <Check className="h-3 w-3" /> : i + 1}
                        </div>
                        <span className={cn(
                            'text-sm font-medium whitespace-nowrap',
                            i === current ? 'text-foreground' : 'text-muted-foreground'
                        )}>{label}</span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                        <div className={cn('mx-3 h-px w-8 transition-colors shrink-0', i < current ? 'bg-primary' : 'bg-border')} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateLeadForm() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchedClient[]>([]);
    const [searched, setSearched] = useState(false);
    const [selectedClient, setSelectedClient] = useState<SearchedClient | null>(null);
    const [savedClientId, setSavedClientId] = useState<string | null>(null);
    const [isNewClient, setIsNewClient] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isPending, startTransition] = useTransition();

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

    // ── Step 1: search ──
    function handleSearch() {
        if (!query.trim()) return;
        startTransition(async () => {
            const found = await searchClients(query.trim());
            setResults(found as SearchedClient[]);
            setSearched(true);
            setStep(1);
        });
    }

    // ── Step 2: pick existing client ──
    function pickClient(client: SearchedClient) {
        setSelectedClient(client);
        setIsNewClient(false);
        // Pre-fill confirm form
        clientForm.reset({
            firstName: client.firstName,
            lastName:  client.lastName,
            email:     client.contact?.email || '',
            phone:     client.contact?.phone || '',
            source:    client.source || '',
        });
        setStep(2);
    }

    function chooseNewClient() {
        setSelectedClient(null);
        setIsNewClient(true);
        clientForm.reset({ firstName: '', lastName: '', email: '', phone: '', source: '' });
        setStep(2);
    }

    // ── Step 3: confirm / edit details — auto-save client ──
    async function onClientConfirm(data: ClientValues) {
        clientForm.reset(data);
        // If new client, save immediately before moving to requirements
        if (isNewClient && !savedClientId) {
            startTransition(async () => {
                try {
                    const id = await saveClient(data);
                    setSavedClientId(id);
                } catch {
                    // non-fatal — createLead will create it if missing
                }
                setStep(3);
            });
        } else {
            setStep(3);
        }
    }

    // ── Step 4: requirements → submit ──
    async function onRequirementSubmit(data: RequirementValues) {
        setSubmitting(true);
        try {
            const clientData = clientForm.getValues();
            const { type, priority, leadOwner, minBudget, maxBudget, location, notes } = data;
            await createLead({
                ...clientData,
                existingClientId: selectedClient?.id ?? savedClientId ?? undefined,
                type,
                priority,
                leadOwner,
                requirement: { minBudget, maxBudget, location, notes },
            });
            router.push('/manage/leads');
        } catch {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-xl">
            <Steps current={step} />

            {/* ── Step 1: Search ── */}
            {step === 0 && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Search by name, phone, or email to find an existing client.</p>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Name, phone or email..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            autoFocus
                        />
                        <Button type="button" onClick={handleSearch} disabled={isPending || !query.trim()}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={chooseNewClient}>
                        <UserPlus className="h-4 w-4 mr-2" /> Create New Client
                    </Button>
                </div>
            )}

            {/* ── Step 2: Pick from results ── */}
            {step === 1 && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {results.length > 0
                            ? `Found ${results.length} client${results.length > 1 ? 's' : ''}. Select one or create new.`
                            : 'No clients found. Create a new one.'}
                    </p>

                    {results.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => pickClient(c)}
                            className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <div>
                                <p className="font-medium">{c.firstName} {c.lastName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {[c.contact?.phone, c.contact?.email].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                    ))}

                    <Button type="button" variant="outline" className="w-full" onClick={chooseNewClient}>
                        <UserPlus className="h-4 w-4 mr-2" /> Create New Client
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(0)}>← Back</Button>
                </div>
            )}

            {/* ── Step 3: Confirm / edit client details ── */}
            {step === 2 && (
                isNewClient ? (
                    <Form {...clientForm}>
                        <form onSubmit={clientForm.handleSubmit(onClientConfirm)} className="space-y-5">
                            <p className="text-sm text-muted-foreground">Fill in the new client's details.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={clientForm.control} name="firstName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl><Input placeholder="John" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={clientForm.control} name="lastName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={clientForm.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={clientForm.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl><Input placeholder="+977 98XXXXXXXX" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={clientForm.control} name="source" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                                    <FormControl><Input placeholder="e.g. Referral, Facebook, Walk-in" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setStep(searched ? 1 : 0)}>Back</Button>
                                <Button type="submit" disabled={isPending} className="flex-1">
                                    {isPending ? 'Saving...' : 'Continue'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    /* Existing client — read-only */
                    <div className="space-y-5">
                        <p className="text-sm text-muted-foreground">Confirm this is the right client before continuing.</p>
                        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                            {[
                                { label: 'Name',   value: `${selectedClient?.firstName} ${selectedClient?.lastName}` },
                                { label: 'Email',  value: selectedClient?.contact?.email || '—' },
                                { label: 'Phone',  value: selectedClient?.contact?.phone || '—' },
                                { label: 'Source', value: selectedClient?.source || '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center px-4 py-2.5 gap-4">
                                    <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
                                    <span className="text-sm font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button type="button" variant="ghost" onClick={() => { setSelectedClient(null); setIsNewClient(true); clientForm.reset({ firstName: '', lastName: '', email: '', phone: '', source: '' }); }}>Not this client</Button>
                            <Button type="button" className="flex-1" onClick={() => setStep(3)}>Continue</Button>
                        </div>
                    </div>
                )
            )}

            {/* ── Step 4: Requirements ── */}
            {step === 3 && (
                <Form {...reqForm}>
                    <form onSubmit={reqForm.handleSubmit(onRequirementSubmit)} className="space-y-6">
                        <FormField control={reqForm.control} name="type" render={() => (
                            <FormItem>
                                <FormLabel>Lead Type</FormLabel>
                                <SelectionCards
                                    options={Object.values(LeadType)}
                                    selected={[selectedType]}
                                    onToggle={(v) => reqForm.setValue('type', v as LeadType, { shouldValidate: true })}
                                />
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={reqForm.control} name="priority" render={() => (
                            <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <SelectionCards
                                    options={Object.values(LeadPriority)}
                                    selected={[selectedPriority]}
                                    onToggle={(v) => reqForm.setValue('priority', v as LeadPriority, { shouldValidate: true })}
                                />
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={reqForm.control} name="minBudget" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Min Budget</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 5000000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={reqForm.control} name="maxBudget" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Budget</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 20000000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={reqForm.control} name="location" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preferred Location <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                                <FormControl><Input placeholder="e.g. Kathmandu, Lalitpur" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={reqForm.control} name="leadOwner" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lead Owner <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                                <FormControl><Input placeholder="Agent name or ID" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={reqForm.control} name="notes" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                                <FormControl><Input placeholder="Any additional context" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="flex gap-3">
                            <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                            <Button type="submit" disabled={submitting} className="flex-1">
                                {submitting ? 'Creating...' : 'Create Lead'}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
}
