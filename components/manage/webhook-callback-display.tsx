
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WebhookCallbackDisplay() {
    const [callbackUrl, setCallbackUrl] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // This runs only on the client, where window is available
        setCallbackUrl(`${window.location.origin}/webhook/whatsapp`);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(callbackUrl).then(() => {
            setIsCopied(true);
            toast({ title: "Copied to clipboard!" });
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            toast({ variant: 'destructive', title: "Failed to copy", description: "Could not copy URL to clipboard." });
        });
    };

    return (
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle>Webhook Callback URL</CardTitle>
                <CardDescription>
                    Use this URL in your Meta for Developers app settings to receive WhatsApp messages.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <Input 
                        value={callbackUrl || "Loading..."} 
                        readOnly 
                        className="pr-12"
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={handleCopy}
                        disabled={!callbackUrl}
                    >
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        <span className="sr-only">Copy URL</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
