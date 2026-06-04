"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { naturalLanguagePropertySearch } from '@/app/actions';
import type { NaturalLanguageSearchOutput } from '@/types';

import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/logica/core/hooks/use-toast';

const formSchema = z.object({
  query: z.string().min(10, {
    message: "Please describe your ideal property in a bit more detail.",
  }),
});

export function NaturalLanguageSearchForm() {
  const [isPending, startTransition] = useTransition();
  const [searchResult, setSearchResult] = useState<NaturalLanguageSearchOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSearchResult(null);
    startTransition(async () => {
      const result = await naturalLanguagePropertySearch(values.query);
      if (result.success && result.data) {
        setSearchResult(result.data);
      } else {
        toast({
          variant: "destructive",
          title: "Search Error",
          description: result.error || "An unknown error occurred.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-white">
        Describe your dream home, and our AI will find the best matches for you.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Input placeholder="e.g., 'a 3-bedroom house in Brooklyn with a backyard for under $800k'" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search with AI'
            )}
          </Button>
        </form>
      </Form>

      {searchResult && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>AI Search Results</AlertTitle>
          <AlertDescription>
            <p><strong>Summary:</strong> {(searchResult as any).summary}</p>
            <ul className="mt-2 list-disc list-inside text-sm">
                <li>Location: {(searchResult as any).location}</li>
                <li>Type: {(searchResult as any).propertyType}</li>
                <li>Price: ${(searchResult as any).minPrice?.toLocaleString()} - ${(searchResult as any).maxPrice?.toLocaleString()}</li>
                <li>Features: {(searchResult as any).bedrooms} bed, {(searchResult as any).bathrooms} bath, {(searchResult as any).squareFootage?.toLocaleString()} sqft</li>
                <li>Amenities: {(searchResult as any).amenities?.join(', ')}</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
