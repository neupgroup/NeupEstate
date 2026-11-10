'use server';

/*
::neup.documentation::manage-property-json-import-action

::private

Validates manage import requests, requires property creation permission, runs
the JSON property import service, and revalidates property listing views after
non-preview imports.

::private end
::end
*/

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { importListingsFromJson, type ListingJsonImportStructure } from '@/services/listings/import';
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;

type ImportActionResult = Awaited<ReturnType<typeof importListingsFromJson>>;

const ImportJsonListingsSchema = z.object({
  dataJson: z.string().min(2, 'Property JSON is required.'),
  structureJson: z.string().min(2, 'Property structure JSON is required.'),
});

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

export async function importJsonListingsAction(input: {
  dataJson: string;
  structureJson: string;
}): Promise<ImportActionResult> {
  try {
    await requirePermission(PERMISSIONS.estate.listing.create);
    const validated = ImportJsonListingsSchema.parse(input);
    const data = parseJson(validated.dataJson, 'Property data');
    const structure = parseJson(validated.structureJson, 'Property structure') as ListingJsonImportStructure;

    if (!structure || typeof structure !== 'object' || !('fields' in structure)) {
      return {
        success: false,
        importedCount: 0,
        failedCount: 0,
        dryRun: false,
        results: [],
        error: 'Property structure must include a fields object.',
      };
    }

    const result = await importListingsFromJson(data, structure);

    if (!result.dryRun && result.importedCount > 0) {
      revalidatePath('/manage/listings');
      revalidatePath('/listings');
    }

    return result;
  } catch (error) {
    return {
      success: false,
      importedCount: 0,
      failedCount: 0,
      dryRun: false,
      results: [],
      error: error instanceof Error ? error.message : 'Failed to import JSON properties.',
    };
  }
}
