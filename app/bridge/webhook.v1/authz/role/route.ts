import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';
import {
  insertRoleCapability,
  updateRoleCapability,
  deleteRoleCapability,
  deleteRoleCapabilities,
  deleteAllRoleCapabilities,
  insertAccountAccessGrant,
  updateAccountAccessGrant,
  deleteAccountAccessGrant,
  deleteAccountAccessGrants,
  deleteAllAccountAccessGrants,
  insertAssetsAccessGrant,
  updateAssetsAccessGrant,
  deleteAssetsAccessGrant,
  deleteAssetsAccessGrants,
  deleteAllAssetsAccessGrants,
  type AuthzTable,
} from '@/services/authz-service';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Shared secret auth — the neupgroup account module must send this header.
// Set BRIDGE_WEBHOOK_SECRET in your environment variables.
// ---------------------------------------------------------------------------
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.BRIDGE_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed if not configured
  return req.headers.get('x-bridge-secret') === secret;
}

// ---------------------------------------------------------------------------
// Operation types
// ---------------------------------------------------------------------------
type Operation =
  | 'insert'
  | 'updateOne'
  | 'update'
  | 'deleteOne'
  | 'delete'
  | 'deleteAll';

interface WebhookPayload {
  table: AuthzTable;
  operation: Operation;
  /** Required for insert, updateOne, update */
  data?: Record<string, unknown> | Record<string, unknown>[];
  /** string for single-record ops; string[] for bulk delete */
  id?: string | string[];
}

class ScopeValidationError extends Error {}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeScopeToken(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitScopeTokens(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map(normalizeScopeToken)
        .filter((token): token is string => Boolean(token)),
    ),
  );
}

function addAllowedScopeToken(set: Set<string>, value: string, keyPrefix?: string) {
  const token = normalizeScopeToken(value);
  if (!token) return;

  set.add(token);
  if (keyPrefix && !token.includes(':')) {
    set.add(`${keyPrefix}:${token}`);
  }
}

function collectAllowedScopeTokens(value: unknown, set: Set<string>, keyPrefix?: string) {
  if (typeof value === 'string') {
    for (const token of splitScopeTokens(value)) {
      addAllowedScopeToken(set, token, keyPrefix);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectAllowedScopeTokens(item, set, keyPrefix);
    }
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, nested] of Object.entries(value)) {
    const nextPrefix =
      key === 'scope' ||
      key === 'scopes' ||
      key === 'tokens' ||
      key === 'values' ||
      key === 'options' ||
      key === 'allowed' ||
      key === 'allowedScopes' ||
      key === 'scopeTokens'
        ? keyPrefix
        : key;

    collectAllowedScopeTokens(nested, set, nextPrefix);
  }
}

function extractAllowedScopeTokens(capability: unknown): string[] {
  if (!isRecord(capability)) return [];

  const tokens = new Set<string>();
  const sources = [
    capability.scope,
    capability.scopes,
    capability.scopeTokens,
    capability.allowedScopes,
    capability.allowedScopeTokens,
    capability.appScope,
    capability.applicationScope,
  ];

  for (const source of sources) {
    collectAllowedScopeTokens(source, tokens);
  }

  return Array.from(tokens).sort();
}

async function validateRoleCapabilityScope(
  data: Record<string, unknown>,
  existingId?: string,
): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(data, 'scope')) return;

  const rawScope = data.scope;
  if (rawScope === undefined || rawScope === null) return;
  if (typeof rawScope !== 'string') {
    throw new ScopeValidationError('`scope` must be a string or null.');
  }

  const normalizedScope = rawScope.trim();
  if (!normalizedScope) return;

  let capabilityPayload = data.denormalizedCapability;

  if (capabilityPayload === undefined && existingId) {
    const existing = await prisma.roleCapability.findUnique({
      where: { id: existingId },
      select: {
        denormalizedCapability: true,
      },
    });
    capabilityPayload = existing?.denormalizedCapability;
  }

  const allowedTokens = extractAllowedScopeTokens(capabilityPayload);
  if (allowedTokens.length === 0) {
    throw new ScopeValidationError(
      'Scope cannot be set because this capability does not define any allowed app scope tokens.',
    );
  }

  const invalidTokens = splitScopeTokens(normalizedScope).filter(
    (token) => !allowedTokens.includes(token),
  );

  if (invalidTokens.length > 0) {
    throw new ScopeValidationError(
      `Invalid scope token${invalidTokens.length === 1 ? '' : 's'}: ${invalidTokens.join(', ')}. Allowed tokens: ${allowedTokens.join(', ')}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
const postHandler = async (req: NextRequest) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { table, operation, data, id } = payload;

  if (!table || !operation) {
    return NextResponse.json(
      { error: '`table` and `operation` are required.' },
      { status: 400 },
    );
  }

  // Normalise id: always work with a string for single ops, string[] for bulk
  const singleId = typeof id === 'string' ? id : undefined;
  const bulkIds   = Array.isArray(id) ? id : undefined;

  try {
    return await prisma.$transaction(async (tx) => {
      switch (table) {
        case 'authz_role_capability': {
          switch (operation) {
            case 'insert': {
              if (!data || Array.isArray(data)) return missingField('data (object)');
              await validateRoleCapabilityScope(data);
              const newId = await insertRoleCapability(data as any, tx);
              return NextResponse.json({ id: newId }, { status: 201 });
            }
            case 'updateOne': {
              if (!singleId) return missingField('id (string)');
              if (!data || Array.isArray(data)) return missingField('data (object)');
              await validateRoleCapabilityScope(data, singleId);
              await updateRoleCapability(singleId, data as any, tx);
              return NextResponse.json({ ok: true });
            }
            case 'update': {
              if (!Array.isArray(data)) return missingField('data (array)');
              for (const item of data) {
                if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
                const { id: rid, ...rest } = item as Record<string, unknown>;
                if (typeof rid !== 'string' || !rid.trim()) {
                  throw new ScopeValidationError('Each `update` record must include an `id` string.');
                }
                await validateRoleCapabilityScope(rest, rid);
              }
              for (const item of data as any[]) {
                const { id: rid, ...rest } = item;
                await updateRoleCapability(rid, rest, tx);
              }
              return NextResponse.json({ ok: true, count: data.length });
            }
            case 'deleteOne': {
              if (!singleId) return missingField('id (string)');
              await deleteRoleCapability(singleId, tx);
              return NextResponse.json({ ok: true });
            }
            case 'delete': {
              if (!bulkIds?.length) return missingField('id (array)');
              const count = await deleteRoleCapabilities(bulkIds, tx);
              return NextResponse.json({ ok: true, count });
            }
            case 'deleteAll': {
              const count = await deleteAllRoleCapabilities(tx);
              return NextResponse.json({ ok: true, count });
            }
            default:
              return unknownOperation(operation);
          }
        }

        case 'authz_account_access_grant': {
          switch (operation) {
            case 'insert': {
              if (!data || Array.isArray(data)) return missingField('data (object)');
              const newId = await insertAccountAccessGrant(data as any, tx);
              return NextResponse.json({ id: newId }, { status: 201 });
            }
            case 'updateOne': {
              if (!singleId) return missingField('id (string)');
              if (!data || Array.isArray(data)) return missingField('data (object)');
              await updateAccountAccessGrant(singleId, data as any, tx);
              return NextResponse.json({ ok: true });
            }
            case 'update': {
              if (!Array.isArray(data)) return missingField('data (array)');
              for (const item of data as any[]) {
                const { id: rid, ...rest } = item;
                await updateAccountAccessGrant(rid, rest, tx);
              }
              return NextResponse.json({ ok: true, count: data.length });
            }
            case 'deleteOne': {
              if (!singleId) return missingField('id (string)');
              await deleteAccountAccessGrant(singleId, tx);
              return NextResponse.json({ ok: true });
            }
            case 'delete': {
              if (!bulkIds?.length) return missingField('id (array)');
              const count = await deleteAccountAccessGrants(bulkIds, tx);
              return NextResponse.json({ ok: true, count });
            }
            case 'deleteAll': {
              const count = await deleteAllAccountAccessGrants(tx);
              return NextResponse.json({ ok: true, count });
            }
            default:
              return unknownOperation(operation);
          }
        }

        case 'authz_assets_access_grant': {
          switch (operation) {
            case 'insert': {
              if (!data || Array.isArray(data)) return missingField('data (object)');
              const newId = await insertAssetsAccessGrant(data as any, tx);
              return NextResponse.json({ id: newId }, { status: 201 });
            }
            case 'updateOne': {
              if (!singleId) return missingField('id (string)');
              if (!data || Array.isArray(data)) return missingField('data (object)');
              await updateAssetsAccessGrant(singleId, data as any, tx);
              return NextResponse.json({ ok: true });
            }
            case 'update': {
              if (!Array.isArray(data)) return missingField('data (array)');
              for (const item of data as any[]) {
                const { id: rid, ...rest } = item;
                await updateAssetsAccessGrant(rid, rest, tx);
              }
              return NextResponse.json({ ok: true, count: data.length });
            }
            case 'deleteOne': {
              if (!singleId) return missingField('id (string)');
              await deleteAssetsAccessGrant(singleId, tx);
              return NextResponse.json({ ok: true });
            }
            case 'delete': {
              if (!bulkIds?.length) return missingField('id (array)');
              const count = await deleteAssetsAccessGrants(bulkIds, tx);
              return NextResponse.json({ ok: true, count });
            }
            case 'deleteAll': {
              const count = await deleteAllAssetsAccessGrants(tx);
              return NextResponse.json({ ok: true, count });
            }
            default:
              return unknownOperation(operation);
          }
        }

        default:
          return NextResponse.json(
            {
              error: `Unknown table: "${table}". Valid values: authz_role_capability, authz_account_access_grant, authz_assets_access_grant.`,
            },
            { status: 400 },
          );
      }
    });
  } catch (err: any) {
    if (err instanceof ScopeValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    await logProblem(err, `bridge/webhook.v1/authz/role [${table}:${operation}]`);
    return NextResponse.json({ error: err.message ?? 'Internal server error.' }, { status: 500 });
  }
};

export const POST = withRequestDevLog({ source: 'webhook', name: 'bridge/webhook.v1/authz/role:POST' }, postHandler);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function missingField(field: string) {
  return NextResponse.json({ error: `Missing required field: \`${field}\`.` }, { status: 400 });
}

function unknownOperation(op: string) {
  return NextResponse.json(
    {
      error: `Unknown operation: "${op}". Valid values: insert, updateOne, update, deleteOne, delete, deleteAll.`,
    },
    { status: 400 },
  );
}
