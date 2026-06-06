
"use client";

import { useState, useTransition } from 'react';
import { 
    getPendingPropertiesForAgent, 
    getApprovedPropertiesForAgent, 
    runPropertyApproval, 
    runPropertyAmendment,
    runPropertyAssurance,
} from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/logica/core/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, Bot, Wrench, CircleDashed, ShieldCheck, StepForward } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PropertyAssuranceResult } from '@/types';
import { ClientLink } from '@/components/client-link';

type AgentResult = {
  propertyId: string;
  title: string;
  kind?: 'property' | 'draft';
  requestId?: string;
  status: 'queued' | 'processing' | 'approved' | 'amended' | 'skipped' | 'failed' | 'assured';
  reason?: string;
  steps?: string[];
};

export default function IntelligencePage() {
    const { toast } = useToast();
    const [isAssuranceAgentRunning, startAssuranceTransition] = useTransition();
    const [isApprovalAgentRunning, startApprovalTransition] = useTransition();
    const [isAmendmentAgentRunning, startAmendmentTransition] = useTransition();
    
    const [assuranceResults, setAssuranceResults] = useState<AgentResult[]>([]);
    const [approvalResults, setApprovalResults] = useState<AgentResult[]>([]);
    const [amendmentResults, setAmendmentResults] = useState<AgentResult[]>([]);

    const handleRunAssuranceAgent = async (formData: FormData) => {
        if (isAgentRunning) return;
        const limit = Number(formData.get('limit')) || 50;
        setAssuranceResults([]);

        startAssuranceTransition(async () => {
            try {
                const propertiesToProcess = await getPendingPropertiesForAgent(limit);
                if (propertiesToProcess.length === 0) {
                    toast({ title: "No pending properties to process." });
                    return;
                }

                setAssuranceResults(propertiesToProcess.map(p => ({ propertyId: p.id, title: p.title, status: 'queued' })));

                let processedCount = 0;
                for (const prop of propertiesToProcess) {
                    setAssuranceResults(prev => prev.map(r => r.propertyId === prop.id ? { ...r, status: 'processing' } : r));
                    
                    try {
                        const result: PropertyAssuranceResult = await runPropertyAssurance(prop.id);
                        setAssuranceResults(prev => prev.map(r => r.propertyId === prop.id
                            ? { ...r, status: result.assured ? 'assured' : 'failed', reason: result.reason, steps: result.steps }
                            : r
                        ));
                    } catch (e: any) {
                        setAssuranceResults(prev => prev.map(r => r.propertyId === prop.id
                            ? { ...r, status: 'failed', reason: e.message || "An unknown error occurred.", steps: ["Agent failed to execute."] }
                            : r
                        ));
                    }
                    processedCount++;
                }

                toast({ title: "Assurance Agent Finished", description: `Processed ${processedCount} properties.` });

            } catch (e: any) {
                 toast({ variant: 'destructive', title: "Agent Failed", description: e.message });
                 setAssuranceResults([]);
            }
        });
    };

    const handleRunApprovalAgent = async (formData: FormData) => {
        if (isAgentRunning) return;
        const limit = Number(formData.get('limit')) || 50;
        setApprovalResults([]);

        startApprovalTransition(async () => {
            try {
                const propertiesToProcess = await getPendingPropertiesForAgent(limit);
                if (propertiesToProcess.length === 0) {
                    toast({ title: "No pending properties to process." });
                    return;
                }

                setApprovalResults(propertiesToProcess.map(p => ({ propertyId: p.id, title: p.title, kind: p.kind, requestId: p.requestId, status: 'queued' })));

                let processedCount = 0;
                for (const prop of propertiesToProcess) {
                    setApprovalResults(prev => prev.map(r => r.propertyId === prop.id ? { ...r, status: 'processing' } : r));
                    
                    try {
                        const result = await runPropertyApproval(prop.id);
                        setApprovalResults(prev => prev.map(r => r.propertyId === prop.id
                            ? { ...r, status: result.approved ? 'approved' : 'skipped', reason: result.reason }
                            : r
                        ));
                    } catch (e: any) {
                        setApprovalResults(prev => prev.map(r => r.propertyId === prop.id
                            ? { ...r, status: 'failed', reason: e.message || "An unknown error occurred." }
                            : r
                        ));
                    }
                    processedCount++;
                }

                toast({ title: "Approval Agent Finished", description: `Processed ${processedCount} properties.` });

            } catch (e: any) {
                 toast({ variant: 'destructive', title: "Agent Failed", description: e.message });
                 setApprovalResults([]);
            }
        });
    };

    const handleRunAmendmentAgent = async (formData: FormData) => {
        if (isAgentRunning) return;
        const limit = Number(formData.get('limit')) || 50;
        setAmendmentResults([]);

        startAmendmentTransition(async () => {
             try {
                const propertiesToProcess = await getApprovedPropertiesForAgent(limit);
                 if (propertiesToProcess.length === 0) {
                    toast({ title: "No suitable properties found to amend." });
                    return;
                }

                setAmendmentResults(propertiesToProcess.map(p => ({ propertyId: p.id, title: p.title, status: 'queued' })));

                let processedCount = 0;
                 for (const prop of propertiesToProcess) {
                    setAmendmentResults(prev => prev.map(r => r.propertyId === prop.id ? { ...r, status: 'processing' } : r));
                    
                    try {
                        const result = await runPropertyAmendment(prop.id);
                        setAmendmentResults(prev => prev.map(r => r.propertyId === prop.id
                            ? { ...r, status: result.amended ? 'amended' : 'skipped', reason: result.reason }
                            : r
                        ));
                    } catch (e: any) {
                         setAmendmentResults(prev => prev.map(r => r.propertyId === prop.id
                            ? { ...r, status: 'failed', reason: e.message || "An unknown error occurred." }
                            : r
                        ));
                    }
                    processedCount++;
                }
                 toast({ title: "Amendment Agent Finished", description: `Processed ${processedCount} properties.` });
            } catch (e: any) {
                toast({ variant: 'destructive', title: "Agent Failed", description: e.message });
                setAmendmentResults([]);
            }
        });
    };

    const getStatusIcon = (status: AgentResult['status']) => {
        switch(status) {
            case 'approved':
            case 'amended':
            case 'assured':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'skipped':
                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
            case 'failed':
                return <AlertCircle className="h-5 w-5 text-destructive" />;
            case 'processing':
                return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
            case 'queued':
                return <CircleDashed className="h-5 w-5 text-muted-foreground" />;
            default:
                return null;
        }
    };
    
    const isAgentRunning = isApprovalAgentRunning || isAmendmentAgentRunning || isAssuranceAgentRunning;

    const renderResults = (results: AgentResult[]) => {
        if (results.length === 0) return null;

        return (
            <div className="mt-6 space-y-2">
                {results.map(result => (
                    <Card key={result.propertyId}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="flex-shrink-0">
                                    {getStatusIcon(result.status)}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="text-xs text-muted-foreground">ID: {result.propertyId}</p>
                                    <ClientLink
                                        href={result.kind === 'draft'
                                          ? `/manage/properties/create?request=${result.requestId || result.propertyId}`
                                          : `/manage/properties/${result.propertyId}/edit`}
                                        className="text-lg font-semibold truncate hover:underline block"
                                    >
                                        {result.title}
                                    </ClientLink>
                                    <p className="text-sm text-muted-foreground break-words">
                                        <span className="font-medium capitalize">{result.status.replace('_', ' ')}</span>
                                        {result.reason && `: ${result.reason}`}
                                    </p>
                                    {result.kind === 'draft' && (
                                      <p className="text-xs text-muted-foreground">Draft awaiting review</p>
                                    )}
                                     {result.steps && (
                                        <details className="mt-2 text-left">
                                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">View Agent Log</summary>
                                            <div className="mt-2 space-y-1 p-2 bg-muted/50 rounded-md text-xs font-mono max-h-40 overflow-y-auto">
                                                {result.steps.map((step, index) => (
                                                    <div key={index} className="flex items-start">
                                                        <StepForward className="h-3 w-3 mr-2 mt-0.5 text-primary flex-shrink-0" />
                                                        <span className="flex-1">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                     )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };
    
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Intelligence Agents</h1>
                <p className="text-muted-foreground">Automate and analyze your property data with AI.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Property Approval Agent</CardTitle>
                        <CardDescription>
                            Verify and approve pending properties by checking their live source URL for consistency.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleRunApprovalAgent} className="space-y-4">
                             <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="grid w-full sm:w-40 items-center gap-1.5">
                                    <Label htmlFor="approval-limit">Properties to process</Label>
                                    <Input id="approval-limit" name="limit" type="number" defaultValue="50" min="1" max="1000" disabled={isAgentRunning} />
                                </div>
                                <div className="w-full sm:w-auto self-end">
                                    <Button type="submit" disabled={isAgentRunning} className="w-full sm:w-auto">
                                        {isApprovalAgentRunning ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Agent is working...
                                            </>
                                        ) : (
                                            <>
                                                <Bot className="mr-2 h-4 w-4" />
                                                Run Approval Agent
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                        {renderResults(approvalResults)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Property Amendment Agent</CardTitle>
                        <CardDescription>
                            Correct and enrich approved properties by checking their live source URL for updated details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleRunAmendmentAgent} className="space-y-4">
                             <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="grid w-full sm:w-40 items-center gap-1.5">
                                    <Label htmlFor="amendment-limit">Properties to process</Label>
                                    <Input id="amendment-limit" name="limit" type="number" defaultValue="50" min="1" max="1000" disabled={isAgentRunning} />
                                </div>
                                <div className="w-full sm:w-auto self-end">
                                     <Button type="submit" disabled={isAgentRunning} className="w-full sm:w-auto">
                                        {isAmendmentAgentRunning ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Agent is working...
                                            </>
                                        ) : (
                                            <>
                                                <Wrench className="mr-2 h-4 w-4" />
                                                Run Amendment Agent
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                        {renderResults(amendmentResults)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Property Assurance Agent</CardTitle>
                        <CardDescription>
                            A comprehensive agent that first amends a pending property with the latest live data, then verifies and approves it in one step.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleRunAssuranceAgent} className="space-y-4">
                             <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="grid w-full sm:w-40 items-center gap-1.5">
                                    <Label htmlFor="assurance-limit">Properties to process</Label>
                                    <Input id="assurance-limit" name="limit" type="number" defaultValue="50" min="1" max="1000" disabled={isAgentRunning} />
                                </div>
                                <div className="w-full sm:w-auto self-end">
                                    <Button type="submit" disabled={isAgentRunning} className="w-full sm:w-auto">
                                        {isAssuranceAgentRunning ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Agent is working...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Run Assurance Agent
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                        {renderResults(assuranceResults)}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
