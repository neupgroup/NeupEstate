

"use client";

import { useFormStatus } from 'react-dom';
import { useEffect, useState, useActionState } from 'react';
import { addSitemapAction, getNewUrlsFromSitemapAction, processSitemapUrlAction, updateSitemapCheckedTimeAction } from '@/app/actions';
import { getSitemaps } from '@/services/sitemap-service';
import type { Sitemap, SitemapLog } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2, Wand2, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SitemapCheckResult = {
    sitemapId: string;
    sitemapUrl: string;
    isProcessing: boolean;
    currentlyProcessingUrl?: string;
    logs: SitemapLog[];
    summaryMessage?: string;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Sitemap'}
        </Button>
    );
}

function SitemapCheckupProgress({ results }: { results: SitemapCheckResult[] }) {
    if (results.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sitemap Checkup Status</CardTitle>
                <CardDescription>
                    Status of the most recent sitemap checks.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {results.map((result) => (
                    <Alert key={result.sitemapId} variant={!result.isProcessing && result.summaryMessage?.toLowerCase().includes('failed') ? 'destructive' : 'default'}>
                        {result.isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : result.summaryMessage?.toLowerCase().includes('failed') || result.summaryMessage?.toLowerCase().includes('cancelled') ? (
                            <AlertCircle className="h-4 w-4" />
                        ) : (
                            <CheckCircle className="h-4 w-4" />
                        )}
                        <AlertTitle className="break-all">{result.sitemapUrl}</AlertTitle>
                        <AlertDescription>
                           {result.isProcessing && (
                                <div className="mb-2">
                                    <p className="font-semibold">Checking sitemap...</p>
                                    {result.currentlyProcessingUrl && (
                                        <p className="text-xs text-muted-foreground truncate">&gt; {result.currentlyProcessingUrl}</p>
                                    )}
                                </div>
                            )}
                            {result.summaryMessage && !result.isProcessing && (
                                <p className="mb-2 font-semibold">{result.summaryMessage}</p>
                            )}
                           <details className="mt-2 text-left" open={result.isProcessing}>
                                <summary className="cursor-pointer font-medium text-foreground hover:underline text-sm">
                                    View Full Log ({result.logs.length})
                                </summary>
                                <div className="mt-2 space-y-1 p-2 bg-muted/50 rounded-md text-xs font-mono max-h-60 overflow-y-auto">
                                    {result.logs?.map((log, index) => (
                                        <div key={index} className="py-1 border-b border-background last:border-b-0">
                                            <div className="flex items-start">
                                                <span className="text-muted-foreground mr-2">-&gt;</span>
                                                <span className="flex-1">{log.message}</span>
                                            </div>
                                            {(log.rawHtml || log.updatedData) && (
                                                <div className="pl-5 space-y-1 mt-1">
                                                    {log.rawHtml && (
                                                        <details>
                                                            <summary className="text-xs cursor-pointer font-sans text-muted-foreground hover:text-foreground">View Fetched HTML</summary>
                                                            <pre className="mt-1 p-2 bg-background rounded-md text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                                                                {log.rawHtml}
                                                            </pre>
                                                        </details>
                                                    )}
                                                    {log.updatedData && (
                                                        <details>
                                                            <summary className="text-xs cursor-pointer font-sans text-muted-foreground hover:text-foreground">View Updated Data</summary>
                                                            <pre className="mt-1 p-2 bg-background rounded-md text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                                                                {JSON.stringify(log.updatedData, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </AlertDescription>
                    </Alert>
                ))}
            </CardContent>
        </Card>
    );
}


function SitemapList({ 
    sitemaps, 
    onProcess,
    onCancel,
    processingSitemapId,
}: { 
    sitemaps: Sitemap[]; 
    onProcess: (sitemapId: string) => void;
    onCancel: () => void;
    processingSitemapId: string | null;
}) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (sitemaps.length === 0) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Sitemaps Found</AlertTitle>
                <AlertDescription>
                    Add a sitemap URL above to begin automating property imports.
                </AlertDescription>
            </Alert>
        );
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sitemaps.map((sitemap) => (
                    <TableRow key={sitemap.id}>
                        <TableCell className="font-medium break-all">{sitemap.url}</TableCell>
                        <TableCell>
                            {sitemap.lastChecked 
                                ? (isClient ? new Date(sitemap.lastChecked).toLocaleString() : 'Loading date...') 
                                : 'Never'
                            }
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                             {processingSitemapId === sitemap.id ? (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={onCancel}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                             ) : (
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onProcess(sitemap.id)}
                                    disabled={!!processingSitemapId}
                                >
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Check Now
                                </Button>
                             )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


export default function AutomationPage() {
    const { toast } = useToast();
    const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingSitemapId, setProcessingSitemapId] = useState<string | null>(null);
    const [checkResults, setCheckResults] = useState<SitemapCheckResult[]>([]);
    const [isCancelled, setIsCancelled] = useState(false);

    const [state, formAction] = useActionState(addSitemapAction, { success: false, error: null });

    async function loadSitemaps() {
      setIsLoading(true);
      try {
        const fetchedSitemaps = await getSitemaps();
        setSitemaps(fetchedSitemaps);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error fetching sitemaps', description: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    const handleCancelProcessing = () => {
        setIsCancelled(true);
        toast({ title: "Cancellation Requested", description: "The process will stop after the current URL is finished." });
    };

    const handleProcessSitemap = async (sitemapId: string) => {
        const sitemap = sitemaps.find(s => s.id === sitemapId);
        if (!sitemap) return;

        setProcessingSitemapId(sitemapId);
        setIsCancelled(false); // Reset cancellation state on new run

        const initialResultState: SitemapCheckResult = {
            sitemapId,
            sitemapUrl: sitemap.url,
            isProcessing: true,
            logs: [],
        };
        // Add new check result to the top of the list, replacing any old one for the same sitemap
        setCheckResults(prev => [initialResultState, ...prev.filter(r => r.sitemapId !== sitemapId)]);
        
        try {
            const { newUrls, logs: initialLogs } = await getNewUrlsFromSitemapAction(sitemapId);
            
            setCheckResults(prev => prev.map(r => r.sitemapId === sitemapId ? { ...r, logs: initialLogs } : r));
            
            let importedCount = 0;
            let skippedCount = 0;
            let finalSummaryMessage = '';

            for (const [index, url] of newUrls.entries()) {
                if (isCancelled) {
                    finalSummaryMessage = `Process cancelled by user. Imported: ${importedCount}, Skipped: ${skippedCount}.`;
                    setCheckResults(prev => prev.map(r => r.sitemapId === sitemapId ? { ...r, logs: [...r.logs, { status: 'info', message: "Processing cancelled." }] } : r));
                    break;
                }
                
                setCheckResults(prev => prev.map(r => r.sitemapId === sitemapId ? { ...r, currentlyProcessingUrl: url } : r));
                
                const log = await processSitemapUrlAction(url);
                
                if (log.status === 'success') importedCount++;
                if (log.status === 'skipped') skippedCount++;
                
                setCheckResults(prev => prev.map(r => r.sitemapId === sitemapId ? { ...r, logs: [...r.logs, log] } : r));
                
                // Update timestamp every 5 URLs
                if ((index + 1) % 5 === 0) {
                    await updateSitemapCheckedTimeAction(sitemapId);
                }
            }

            if (!finalSummaryMessage) {
                finalSummaryMessage = `Finished. Found ${newUrls.length} new URLs. Imported: ${importedCount}, Skipped: ${skippedCount}.`;
            }
            
            await updateSitemapCheckedTimeAction(sitemapId);
            
            setCheckResults(prev => prev.map(r => r.sitemapId === sitemapId ? { 
                ...r, 
                isProcessing: false,
                currentlyProcessingUrl: undefined,
                summaryMessage: finalSummaryMessage,
            } : r));
            
            toast({
                title: "Sitemap Processed",
                description: finalSummaryMessage,
            });

        } catch (error: any) {
            const errorMessage = `Failed to process sitemap: ${error.message}`;
            setCheckResults(prev => prev.map(r => r.sitemapId === sitemapId ? { 
                ...r, 
                isProcessing: false,
                currentlyProcessingUrl: undefined,
                summaryMessage: errorMessage,
            } : r));
            toast({
                variant: 'destructive',
                title: "Sitemap Processing Failed",
                description: errorMessage
            });
        } finally {
            loadSitemaps();
            setProcessingSitemapId(null);
            setIsCancelled(false); // Reset for next run
        }
    };

    useEffect(() => {
        if (state.error) {
            toast({ variant: 'destructive', title: 'Error', description: state.error });
        }
        if (state.success) {
            toast({ title: 'Success', description: 'Sitemap added successfully.' });
            loadSitemaps();
        }
    }, [state, toast]);
    
    useEffect(() => {
      loadSitemaps();
    }, []);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Sitemap Automation</CardTitle>
                    <CardDescription>
                        Add a website's sitemap.xml URL to automatically discover and import new property listings.
                        The system will find new pages, extract property details, and add them as pending listings for your approval.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="flex items-start gap-4">
                        <Input name="sitemapUrl" placeholder="https://example.com/sitemap.xml" required className="flex-grow" />
                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Tracked Sitemaps</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <p>Loading sitemaps...</p> : 
                        <SitemapList 
                            sitemaps={sitemaps} 
                            onProcess={handleProcessSitemap}
                            onCancel={handleCancelProcessing}
                            processingSitemapId={processingSitemapId}
                        />}
                </CardContent>
            </Card>

            <SitemapCheckupProgress results={checkResults} />
        </div>
    );
}
