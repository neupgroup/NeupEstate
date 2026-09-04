"use client";

import { useMemo, useState, useTransition } from 'react';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Database, Eye, Loader2 } from 'lucide-react';
import { importJsonPropertiesAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import { useToast } from '#/core/hooks/useToast';

/*
::neup.documentation::manage-property-json-import-page

::private

Client workflow for property JSON imports. Operators provide source JSON and a
property structure definition, preview the mapped rows, then import pending
property records through the server action.

::private end
::end
*/

type ImportRowResult = {
  index: number;
  title?: string;
  propertyId?: string;
  importedData?: Record<string, unknown>;
  error?: string;
};

type ImportResult = {
  success: boolean;
  importedCount: number;
  failedCount: number;
  dryRun: boolean;
  results: ImportRowResult[];
  error?: string;
};

const importFormSchema = z.object({
  dataJson: z.string().min(2),
  structureJson: z.string().min(2),
});

const exampleData = {
  properties: [
    {
      id: 'PIN-1001',
      name: 'House for sale in Lalitpur',
      summary: 'A south-facing family home with parking, garden, and quick access to the ring road.',
      askingPrice: '32500000',
      purpose: 'Sale',
      category: 'House',
      areaSqft: 2800,
      beds: 4,
      baths: 3,
      districtId: 'lalitpur',
      agentId: 'agent-1',
      amenityIds: ['parking', 'garden'],
      agency: {
        name: 'Demo Realty',
        email: 'imports@example.com',
      },
      media: [
        { url: 'https://placehold.co/900x600.png' },
        { url: 'https://placehold.co/900x601.png' },
      ],
    },
  ],
  districts: [
    { id: 'lalitpur', label: 'Lalitpur, Bagmati' },
  ],
  agents: [
    { id: 'agent-1', name: 'Ramesh Shrestha' },
  ],
  amenities: [
    { id: 'parking', name: 'Parking' },
    { id: 'garden', name: 'Garden' },
  ],
};

const exampleStructure = {
  collection: 'properties',
  dryRun: true,
  defaults: {
    type: 'Residential',
    bathrooms: 0,
    bedrooms: 0,
  },
  fields: {
    title: 'name',
    description: 'summary',
    price: { path: 'askingPrice', coerce: 'number' },
    purpose: 'purpose',
    category: 'category',
    area: { path: 'areaSqft', coerce: 'number' },
    bedrooms: { path: 'beds', coerce: 'number' },
    bathrooms: { path: 'baths', coerce: 'number' },
    sourceUrl: { path: 'id', coerce: 'string' },
  },
  relationships: {
    details: {
      type: '1-to-1',
      source: 'agency',
      select: {
        importAgencyName: 'name',
        importAgencyEmail: 'email',
      },
    },
    images: {
      type: '1-to-n',
      source: 'media',
      select: 'url',
    },
    location: {
      type: 'n-to-1',
      source: '$.districts',
      localPath: 'districtId',
      foreignPath: 'id',
      select: 'label',
    },
    listingAgent: {
      type: 'n-to-1',
      source: '$.agents',
      localPath: 'agentId',
      foreignPath: 'id',
      select: 'name',
    },
    amenities: {
      type: 'n-to-n',
      source: '$.amenities',
      localPath: 'amenityIds',
      foreignPath: 'id',
      select: 'name',
    },
  },
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function setDryRun(structureJson: string, dryRun: boolean): string {
  const parsed = JSON.parse(structureJson) as Record<string, unknown>;
  return formatJson({ ...parsed, dryRun });
}

export default function ImportPropertiesPage() {
  const [dataJson, setDataJson] = useState(formatJson(exampleData));
  const [structureJson, setStructureJson] = useState(formatJson(exampleStructure));
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const summary = useMemo(() => {
    if (!result) return null;
    const action = result.dryRun ? 'previewed' : 'imported';
    return `${result.importedCount} ${action}, ${result.failedCount} failed`;
  }, [result]);

  function runImport(dryRun: boolean) {
    setResult(null);

    let nextStructureJson = structureJson;
    try {
      nextStructureJson = setDryRun(structureJson, dryRun);
      importFormSchema.parse({ dataJson, structureJson: nextStructureJson });
    } catch (error) {
      toast({ name: "default",
        convey: 'danger',
        title: 'Invalid import input',
        description: error instanceof Error ? error.message : 'Check the JSON data and structure.',
      });
      return;
    }

    setStructureJson(nextStructureJson);

    startTransition(async () => {
      const response = await importJsonPropertiesAction({
        dataJson,
        structureJson: nextStructureJson,
      });

      setResult(response);
      toast({ name: "default",
        convey: response.error ? 'danger' : 'info',
        title: response.error ? 'Import failed' : dryRun ? 'Preview complete' : 'Import complete',
        description: response.error ?? `${response.importedCount} rows processed.`,
      });
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Import Properties</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Import property records from JSON by mapping source fields and relationships into the property structure.
          </p>
        </div>
        <div className="flex gap-2">
          <Button htmlType="button" variant="outlined" onClick={() => runImport(true)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Preview
          </Button>
          <Button htmlType="button" onClick={() => runImport(false)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Import
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Property JSON</CardTitle>
            <CardDescription>Source data can be an array or an object with a collection path.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="property-json">JSON data</Label>
            <Textarea
              id="property-json"
              value={dataJson}
              onChange={(event) => setDataJson(event.target.value)}
              spellCheck={false}
              className="mt-2 min-h-[520px] font-mono text-xs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Structure</CardTitle>
            <CardDescription>Define fields, defaults, and relationship joins for the import.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="property-structure">Structure definition</Label>
            <Textarea
              id="property-structure"
              value={structureJson}
              onChange={(event) => setStructureJson(event.target.value)}
              spellCheck={false}
              className="mt-2 min-h-[520px] font-mono text-xs"
            />
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>{result.error ?? summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.results.map((row) => (
              <Alert key={row.index} variant={row.error ? 'destructive' : 'default'}>
                {row.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle>
                  Row {row.index + 1}: {row.title || 'Untitled property'}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>{row.error ?? (result.dryRun ? 'Ready to import.' : `Imported with ID: ${row.propertyId}`)}</div>
                  {row.importedData && (
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Mapped data</summary>
                      <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {formatJson(row.importedData)}
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
