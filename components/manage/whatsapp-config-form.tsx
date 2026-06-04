
"use client";

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/logica/core/hooks/use-toast';
import { updateWhatsAppConfigAction } from '@/app/actions';
import type { WhatsAppConfig } from '@/types';
import { WhatsAppConfigSchema } from '@/types';
import { Loader2, Pencil, KeyRound, Phone, Hash } from 'lucide-react';

export function WhatsAppConfigForm({ initialConfig }: { initialConfig: WhatsAppConfig }) {
    const { toast } = useToast();
    const [isSaving, startSaveTransition] = useTransition();
    const [isEditingConfig, setIsEditingConfig] = useState(false);

    const configForm = useForm<WhatsAppConfig>({
        resolver: zodResolver(WhatsAppConfigSchema),
        defaultValues: {
            apiToken: initialConfig.apiToken || '',
            phoneNumberId: initialConfig.phoneNumberId || '',
            accountId: initialConfig.accountId || '',
            webhookVerifyToken: initialConfig.webhookVerifyToken || '',
        },
    });

    const onConfigSubmit = (values: WhatsAppConfig) => {
        startSaveTransition(async () => {
            const result = await updateWhatsAppConfigAction(values);
            if (result.success) {
                toast({ title: 'Configuration Saved' });
                setIsEditingConfig(false);
            } else {
                toast({ variant: 'destructive', title: 'Error Saving Config', description: result.error });
            }
        });
    };

    const handleCancelEdit = () => {
        configForm.reset(initialConfig);
        setIsEditingConfig(false);
    };

    return (
        <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(onConfigSubmit)}>
                <Card className="max-w-6xl mx-auto">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>
                                WhatsApp Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure your WhatsApp Business API credentials.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {isEditingConfig ? (
                                <>
                                    <Button variant="outline" type="button" onClick={handleCancelEdit}>Cancel</Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save'}
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => setIsEditingConfig(true)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={configForm.control}
                            name="apiToken"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Token</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your API Token" disabled={!isEditingConfig} className="truncate" />
                                            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-6">
                            <FormField
                                control={configForm.control}
                                name="phoneNumberId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number ID</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your Phone Number ID" disabled={!isEditingConfig} className="truncate" />
                                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={configForm.control}
                                name="accountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account ID</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your Account ID" disabled={!isEditingConfig} className="truncate" />
                                                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={configForm.control}
                            name="webhookVerifyToken"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Webhook Verify Token</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input {...field} type={isEditingConfig ? 'text' : 'password'} placeholder="Your Webhook Secret Token" disabled={!isEditingConfig} className="truncate" />
                                            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Enter this token in your Meta App webhook configuration.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </form>
        </Form>
    )
}
