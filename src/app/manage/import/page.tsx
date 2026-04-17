
"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { extractAndSaveProperty } from '@/app/actions';
import type { ExtractPropertyDetailsOutput } from '@/services/ai/extract-property-details-flow';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const formSchema = z.object({
  urls: z.string().min(10, {
    message: "Please enter at least one URL.",
  }),
});

type Result = {
  url: string;
} & ExtractPropertyDetailsOutput;

export default function ImportPropertiesPage() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Result[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      urls: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setResults([]);
    const urls = values.urls
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter((url) => url !== '');
    if (urls.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No URLs provided',
        description: 'Please enter at least one valid URL.',
      });
      return;
    }

    startTransition(async () => {
      const response = await extractAndSaveProperty(urls);
      if (response.success) {
        setResults(response.results);
        toast({
          title: 'Import process finished',
          description: 'See results below.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'An unexpected error occurred',
          description: 'Please try again.',
        });
      }
    });
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Import Properties</CardTitle>
          <CardDescription>
            Enter one or more property URLs below (one per line) to scrape and save them to the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="urls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property URLs</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="https://example.com/property/123\\nhttps://another.com/listing/456"
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Start Import'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <Alert key={index} variant={result.error ? 'destructive' : 'default'}>
                {result.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                <AlertTitle>{result.error ? 'Failed' : 'Success'}</AlertTitle>
                <AlertDescription className="break-all">
                  <p className="font-semibold">{result.url}</p>
                  {result.error ? <p>Message: {result.error}</p> : <p>Successfully imported with ID: {result.propertyId}</p>}
                  
                  {result.extractedData && (
                    <details className="mt-2 text-left">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">View Extracted Data</summary>
                        <pre className="mt-1 p-2 bg-muted rounded-md text-xs whitespace-pre-wrap">
                            {JSON.stringify(result.extractedData, null, 2)}
                        </pre>
                    </details>
                  )}
                   {result.rawHtml && (
                    <details className="mt-2 text-left">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">View Fetched HTML</summary>
                        <pre className="mt-1 p-2 bg-muted rounded-md text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {result.rawHtml}
                        </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
