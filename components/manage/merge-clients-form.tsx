'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { mergeClients } from '@/services/lead-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    contact: any;
    source: string | null;
    leads: { id: string }[];
};

interface MergeClientsFormProps {
    clients: Client[];
}

type FieldKey = 'firstName' | 'lastName' | 'email' | 'phone' | 'source';

const FIELDS: { key: FieldKey; label: string }[] = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName',  label: 'Last Name' },
    { key: 'email',     label: 'Email' },
    { key: 'phone',     label: 'Phone' },
    { key: 'source',    label: 'Source' },
];

function clientFieldValue(client: Client, key: FieldKey): string {
    if (key === 'email')  return client.contact?.email  || '';
    if (key === 'phone')  return client.contact?.phone  || '';
    if (key === 'source') return client.source          || '';
    return (client as any)[key] || '';
}

export function MergeClientsForm({ clients }: MergeClientsFormProps) {
    const router = useRouter();
    const [step, setStep] = useState<'select' | 'resolve'>(clients.length >= 2 ? 'select' : 'select');
    const [search, setSearch] = useState('');
    const [clientA, setClientA] = useState<Client | null>(null);
    const [clientB, setClientB] = useState<Client | null>(null);
    // For each field, which client's value to keep: 'a' | 'b' | 'custom'
    const [picks, setPicks] = useState<Record<FieldKey, 'a' | 'b' | 'custom'>>({
        firstName: 'a', lastName: 'a', email: 'a', phone: 'a', source: 'a',
    });
    const [custom, setCustom] = useState<Record<FieldKey, string>>({
        firstName: '', lastName: '', email: '', phone: '', source: '',
    });
    // Which client to keep (the other gets deleted)
    const [keepSide, setKeepSide] = useState<'a' | 'b'>('a');
    const [isPending, startTransition] = useTransition();

    const filtered = clients.filter((c) => {
        const q = search.toLowerCase();
        return (
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
            c.contact?.email?.toLowerCase().includes(q) ||
            c.contact?.phone?.includes(q)
        );
    });

    function selectClient(c: Client) {
        if (!clientA) { setClientA(c); return; }
        if (clientA.id === c.id) { setClientA(null); return; }
        if (!clientB) { setClientB(c); return; }
        if (clientB.id === c.id) { setClientB(null); return; }
    }

    function getValue(key: FieldKey): string {
        if (picks[key] === 'custom') return custom[key];
        const src = picks[key] === 'a' ? clientA : clientB;
        return src ? clientFieldValue(src, key) : '';
    }

    function handleMerge() {
        if (!clientA || !clientB) return;
        const keep = keepSide === 'a' ? clientA : clientB;
        const drop = keepSide === 'a' ? clientB : clientA;

        startTransition(async () => {
            await mergeClients({
                keepClientId: keep.id,
                dropClientId: drop.id,
                mergedData: {
                    firstName: getValue('firstName'),
                    lastName:  getValue('lastName'),
                    email:     getValue('email')  || undefined,
                    phone:     getValue('phone')  || undefined,
                    source:    getValue('source') || undefined,
                },
            });
            router.push(`/manage/clients/${keep.id}`);
        });
    }

    return (
        <div className="space-y-8">

            {/* ── Step 1: Select two clients ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Two Clients
                    </h3>
                    {clientA && clientB && (
                        <Button size="sm" onClick={() => setStep('resolve')}>
                            Continue →
                        </Button>
                    )}
                </div>

                {/* Selected summary */}
                {(clientA || clientB) && (
                    <div className="flex items-center gap-3 text-sm">
                        <span className={cn('px-3 py-1 rounded-full border', clientA ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}>
                            {clientA ? `${clientA.firstName} ${clientA.lastName}` : 'Client A'}
                        </span>
                        <span className="text-muted-foreground">+</span>
                        <span className={cn('px-3 py-1 rounded-full border', clientB ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground')}>
                            {clientB ? `${clientB.firstName} ${clientB.lastName}` : 'Client B'}
                        </span>
                    </div>
                )}

                <Input
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filtered.map((c) => {
                        const isA = clientA?.id === c.id;
                        const isB = clientB?.id === c.id;
                        const isSelected = isA || isB;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => selectClient(c)}
                                className={cn(
                                    'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                )}
                            >
                                <div>
                                    <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {[c.contact?.phone, c.contact?.email].filter(Boolean).join(' · ')}
                                        {c.leads.length > 0 && ` · ${c.leads.length} lead${c.leads.length !== 1 ? 's' : ''}`}
                                    </p>
                                </div>
                                {isSelected && (
                                    <span className="text-xs font-semibold text-primary">{isA ? 'A' : 'B'}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Step 2: Resolve fields ── */}
            {clientA && clientB && step === 'resolve' && (
                <div className="space-y-6">
                    <hr className="border-border" />

                    {/* Keep which client */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Keep Which Record</h3>
                        <p className="text-xs text-muted-foreground">The other client record will be deleted. All leads will be moved to the kept record.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {(['a', 'b'] as const).map((side) => {
                                const c = side === 'a' ? clientA : clientB;
                                return (
                                    <button
                                        key={side}
                                        type="button"
                                        onClick={() => setKeepSide(side)}
                                        className={cn(
                                            'rounded-lg border px-4 py-3 text-left transition-colors',
                                            keepSide === side ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-muted-foreground">Client {side.toUpperCase()}</span>
                                            {keepSide === side && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </div>
                                        <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{c.leads.length} lead{c.leads.length !== 1 ? 's' : ''}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Field resolution */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choose Field Values</h3>
                        <div className="rounded-lg border overflow-hidden divide-y divide-border">
                            {FIELDS.map(({ key, label }) => {
                                const valA = clientFieldValue(clientA, key);
                                const valB = clientFieldValue(clientB, key);
                                return (
                                    <div key={key} className="px-4 py-3 space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {valA && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPicks((p) => ({ ...p, [key]: 'a' }))}
                                                    className={cn(
                                                        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                                                        picks[key] === 'a' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                                                    )}
                                                >
                                                    {picks[key] === 'a' && <Check className="h-3 w-3" />}
                                                    <span className="text-xs text-muted-foreground mr-1">A</span>{valA}
                                                </button>
                                            )}
                                            {valB && valB !== valA && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPicks((p) => ({ ...p, [key]: 'b' }))}
                                                    className={cn(
                                                        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                                                        picks[key] === 'b' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                                                    )}
                                                >
                                                    {picks[key] === 'b' && <Check className="h-3 w-3" />}
                                                    <span className="text-xs text-muted-foreground mr-1">B</span>{valB}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setPicks((p) => ({ ...p, [key]: 'custom' }))}
                                                className={cn(
                                                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                                                    picks[key] === 'custom' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                                                )}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                        {picks[key] === 'custom' && (
                                            <Input
                                                value={custom[key]}
                                                onChange={(e) => setCustom((p) => ({ ...p, [key]: e.target.value }))}
                                                placeholder={`Enter ${label.toLowerCase()}...`}
                                                className="mt-1"
                                            />
                                        )}
                                        {picks[key] !== 'custom' && (
                                            <p className="text-sm font-medium text-foreground">{getValue(key) || <span className="text-muted-foreground italic">empty</span>}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Merge button */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setStep('select')}>Back</Button>
                        <Button type="button" onClick={handleMerge} disabled={isPending} className="flex-1">
                            {isPending ? 'Merging...' : `Merge into ${keepSide === 'a' ? clientA.firstName : clientB.firstName} ${keepSide === 'a' ? clientA.lastName : clientB.lastName}`}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
