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
import { importPropertiesFromJson, type PropertyJsonImportStructure } from '@/services/property/json-import';
import { logProblem } from '@/services/problem-service';
import { PERMISSIONS, requirePermission } from '@/services/permissions';

type ImportActionResult = Awaited<ReturnType<typeof importPropertiesFromJson>>;

const ImportJsonPropertiesSchema = z.object({
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

export async function importJsonPropertiesAction(input: {
  dataJson: string;
  structureJson: string;
}): Promise<ImportActionResult> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfCreate);
    const validated = ImportJsonPropertiesSchema.parse(input);
    const data = parseJson(validated.dataJson, 'Property data');
    const structure = parseJson(validated.structureJson, 'Property structure') as PropertyJsonImportStructure;

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

    const result = await importPropertiesFromJson(data, structure);

    if (!result.dryRun && result.importedCount > 0) {
      revalidatePath('/manage/properties');
      revalidatePath('/properties');
    }

    return result;
  } catch (error) {
    await logProblem(error, 'importJsonPropertiesAction');
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
