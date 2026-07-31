'use server';

/*
::neup.documentation::property-json-import

::private

Maps arbitrary JSON collections into property import rows using explicit field
and relationship definitions. Relationship definitions support local one-to-one
and one-to-many data, plus root-level many-to-one and many-to-many lookups.

::private end
::end
*/

import type { ExtractedPropertyData } from '@/types';
import { addProperty } from './update';
import { logProblem } from '@/services/problem-service';

type JsonObject = Record<string, unknown>;
type RelationshipType = '1-to-1' | '1-to-n' | 'n-to-1' | 'n-to-n';
type CoerceMode = 'string' | 'number' | 'boolean' | 'array' | 'csv' | 'first' | 'join';

type FieldDefinition =
  | string
  | {
      path?: string;
      value?: unknown;
      default?: unknown;
      coerce?: CoerceMode;
      joinWith?: string;
    };

type SelectDefinition = string | Record<string, FieldDefinition>;

type RelationshipDefinition = {
  type: RelationshipType;
  source: string;
  localPath?: string;
  foreignPath?: string;
  select?: SelectDefinition;
  coerce?: CoerceMode;
  joinWith?: string;
  default?: unknown;
};

export type PropertyJsonImportStructure = {
  collection?: string;
  fields: Record<string, FieldDefinition>;
  relationships?: Record<string, RelationshipDefinition>;
  defaults?: Record<string, unknown>;
  dryRun?: boolean;
};

export type PropertyJsonImportRowResult = {
  index: number;
  title?: string;
  propertyId?: string;
  importedData?: Record<string, unknown>;
  error?: string;
};

export type PropertyJsonImportResult = {
  success: boolean;
  importedCount: number;
  failedCount: number;
  dryRun: boolean;
  results: PropertyJsonImportRowResult[];
  error?: string;
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function splitPath(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
}

function getPath(source: unknown, path?: string): unknown {
  if (!path) return source;
  const normalizedPath = path.startsWith('$.') ? path.slice(2) : path;
  return splitPath(normalizedPath).reduce<unknown>((current, part) => {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(part);
      return Number.isInteger(index) ? current[index] : undefined;
    }
    if (isObject(current)) return current[part];
    return undefined;
  }, source);
}

function resolvePath(input: { path?: string; item: JsonObject; root: unknown }): unknown {
  if (!input.path) return input.item;
  return input.path.startsWith('$.')
    ? getPath(input.root, input.path)
    : getPath(input.item, input.path);
}

function applyCoerce(value: unknown, mode?: CoerceMode, joinWith = ', '): unknown {
  if (value == null) return value;

  if (mode === 'first') return Array.isArray(value) ? value[0] : value;
  if (mode === 'join') return Array.isArray(value) ? value.map(String).join(joinWith) : String(value);
  if (mode === 'array') return Array.isArray(value) ? value : [value];
  if (mode === 'csv') {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
  if (mode === 'number') {
    const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }
  if (mode === 'boolean') {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
    return undefined;
  }
  if (mode === 'string') return String(value);

  return value;
}

function resolveField(definition: FieldDefinition, item: JsonObject, root: unknown): unknown {
  if (typeof definition === 'string') return resolvePath({ path: definition, item, root });

  const value = 'value' in definition
    ? definition.value
    : resolvePath({ path: definition.path, item, root });
  const fallbackValue = value === undefined || value === null || value === ''
    ? definition.default
    : value;

  return applyCoerce(fallbackValue, definition.coerce, definition.joinWith);
}

function selectValue(source: unknown, select: SelectDefinition | undefined, root: unknown): unknown {
  if (!select) return source;
  if (typeof select === 'string') return getPath(source, select);
  if (!isObject(source)) return undefined;

  return Object.entries(select).reduce<JsonObject>((selected, [key, definition]) => {
    const value = resolveField(definition, source, root);
    if (value !== undefined) selected[key] = value;
    return selected;
  }, {});
}

function primitiveSet(value: unknown): Set<unknown> {
  if (Array.isArray(value)) return new Set(value);
  return new Set([value]);
}

function resolveRelationship(
  definition: RelationshipDefinition,
  item: JsonObject,
  root: unknown,
): unknown {
  const source = definition.source.startsWith('$.')
    ? getPath(root, definition.source)
    : getPath(item, definition.source);

  if (definition.type === '1-to-1') {
    const selected = selectValue(source, definition.select, root);
    return applyCoerce(selected ?? definition.default, definition.coerce, definition.joinWith);
  }

  if (definition.type === '1-to-n') {
    const rows = Array.isArray(source) ? source : [];
    const selected = rows.map((row) => selectValue(row, definition.select, root)).filter((value) => value !== undefined);
    return applyCoerce(selected.length ? selected : definition.default, definition.coerce, definition.joinWith);
  }

  const foreignRows = Array.isArray(source) ? source : [];
  const localValues = primitiveSet(resolvePath({ path: definition.localPath, item, root }));

  const matched = foreignRows.filter((row) => {
    const foreignValue = getPath(row, definition.foreignPath);
    if (Array.isArray(foreignValue)) return foreignValue.some((value) => localValues.has(value));
    return localValues.has(foreignValue);
  });

  if (definition.type === 'n-to-1') {
    const selected = matched.length ? selectValue(matched[0], definition.select, root) : definition.default;
    return applyCoerce(selected, definition.coerce, definition.joinWith);
  }

  const selected = matched.map((row) => selectValue(row, definition.select, root)).filter((value) => value !== undefined);
  return applyCoerce(selected.length ? selected : definition.default, definition.coerce, definition.joinWith);
}

function normalizePropertyData(data: Record<string, unknown>): ExtractedPropertyData {
  const category = Array.isArray(data.categories) ? data.categories[0] : data.category;
  const type = Array.isArray(data.types) ? data.types[0] : data.type;
  const purpose = Array.isArray(data.purposes) ? data.purposes[0] : data.purpose;
  const areaValue = isObject(data.area) ? data.area.sqft : data.area;

  return {
    isPropertyPage: true,
    ...data,
    title: typeof data.title === 'string' ? data.title : String(data.title ?? ''),
    description: typeof data.description === 'string' ? data.description : String(data.description ?? ''),
    location: typeof data.location === 'string' ? data.location : String(data.location ?? ''),
    price: applyCoerce(data.price, 'number') as number | undefined,
    area: applyCoerce(areaValue, 'number') as number | undefined,
    bedrooms: applyCoerce(data.bedrooms, 'number') as number | undefined,
    bathrooms: applyCoerce(data.bathrooms, 'number') as number | undefined,
    purpose: purpose as ExtractedPropertyData['purpose'],
    category: category as ExtractedPropertyData['category'],
    type: type as ExtractedPropertyData['type'],
    amenities: Array.isArray(data.amenities) ? data.amenities.map(String) : undefined,
    images: Array.isArray(data.images) ? data.images.map(String).filter(Boolean) : undefined,
  };
}

function validateImportableProperty(data: ExtractedPropertyData): string[] {
  const missing: string[] = [];
  if (!data.title) missing.push('title');
  if (!data.description) missing.push('description');
  if (!data.location) missing.push('location');
  if (!data.purpose) missing.push('purpose');
  if (!data.category) missing.push('category');
  if (!data.type) missing.push('type');
  return missing;
}

function buildRows(input: unknown, structure: PropertyJsonImportStructure): JsonObject[] {
  const collection = structure.collection ? getPath(input, structure.collection) : input;
  const rows = Array.isArray(collection) ? collection : [collection];
  return rows.filter(isObject);
}

export async function importPropertiesFromJson(
  input: unknown,
  structure: PropertyJsonImportStructure,
): Promise<PropertyJsonImportResult> {
  try {
    const rows = buildRows(input, structure);
    const dryRun = structure.dryRun === true;
    const results: PropertyJsonImportRowResult[] = [];

    for (const [index, item] of rows.entries()) {
      try {
        const mappedData: Record<string, unknown> = { ...(structure.defaults ?? {}) };

        for (const [key, definition] of Object.entries(structure.fields ?? {})) {
          const value = resolveField(definition, item, input);
          if (value !== undefined) mappedData[key] = value;
        }

        for (const [key, definition] of Object.entries(structure.relationships ?? {})) {
          const value = resolveRelationship(definition, item, input);
          if (value !== undefined) mappedData[key] = value;
        }

        const propertyData = normalizePropertyData(mappedData);
        const missing = validateImportableProperty(propertyData);

        if (missing.length) {
          results.push({
            index,
            title: propertyData.title,
            importedData: propertyData,
            error: `Missing required mapped fields: ${missing.join(', ')}.`,
          });
          continue;
        }

        const propertyId = dryRun ? undefined : await addProperty(propertyData);
        results.push({
          index,
          title: propertyData.title,
          propertyId,
          importedData: propertyData,
        });
      } catch (error) {
        await logProblem(error, `importPropertiesFromJson row ${index}`);
        results.push({
          index,
          title: typeof item.title === 'string' ? item.title : undefined,
          error: error instanceof Error ? error.message : 'Failed to import row.',
        });
      }
    }

    const failedCount = results.filter((result) => result.error).length;

    return {
      success: failedCount === 0,
      importedCount: results.length - failedCount,
      failedCount,
      dryRun,
      results,
    };
  } catch (error) {
    await logProblem(error, 'importPropertiesFromJson');
    return {
      success: false,
      importedCount: 0,
      failedCount: 0,
      dryRun: structure.dryRun === true,
      results: [],
      error: error instanceof Error ? error.message : 'Failed to import JSON properties.',
    };
  }
}
