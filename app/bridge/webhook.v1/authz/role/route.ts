import { NextRequest, NextResponse } from 'next/server';
import { logProblem } from '@/services/problem-service';
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

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
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
    switch (table) {
      // ======================================================================
      case 'authz_role_capability': {
        switch (operation) {
          case 'insert': {
            if (!data || Array.isArray(data)) return missingField('data (object)');
            const newId = await insertRoleCapability(data as any);
            return NextResponse.json({ id: newId }, { status: 201 });
          }
          case 'updateOne': {
            if (!singleId) return missingField('id (string)');
            if (!data || Array.isArray(data)) return missingField('data (object)');
            await updateRoleCapability(singleId, data as any);
            return NextResponse.json({ ok: true });
          }
          case 'update': {
            if (!Array.isArray(data)) return missingField('data (array)');
            await Promise.all(
              (data as any[]).map(({ id: rid, ...rest }) => updateRoleCapability(rid, rest)),
            );
            return NextResponse.json({ ok: true, count: data.length });
          }
          case 'deleteOne': {
            if (!singleId) return missingField('id (string)');
            await deleteRoleCapability(singleId);
            return NextResponse.json({ ok: true });
          }
          case 'delete': {
            if (!bulkIds?.length) return missingField('id (array)');
            const count = await deleteRoleCapabilities(bulkIds);
            return NextResponse.json({ ok: true, count });
          }
          case 'deleteAll': {
            const count = await deleteAllRoleCapabilities();
            return NextResponse.json({ ok: true, count });
          }
          default:
            return unknownOperation(operation);
        }
      }

      // ======================================================================
      case 'authz_account_access_grant': {
        switch (operation) {
          case 'insert': {
            if (!data || Array.isArray(data)) return missingField('data (object)');
            const newId = await insertAccountAccessGrant(data as any);
            return NextResponse.json({ id: newId }, { status: 201 });
          }
          case 'updateOne': {
            if (!singleId) return missingField('id (string)');
            if (!data || Array.isArray(data)) return missingField('data (object)');
            await updateAccountAccessGrant(singleId, data as any);
            return NextResponse.json({ ok: true });
          }
          case 'update': {
            if (!Array.isArray(data)) return missingField('data (array)');
            await Promise.all(
              (data as any[]).map(({ id: rid, ...rest }) => updateAccountAccessGrant(rid, rest)),
            );
            return NextResponse.json({ ok: true, count: data.length });
          }
          case 'deleteOne': {
            if (!singleId) return missingField('id (string)');
            await deleteAccountAccessGrant(singleId);
            return NextResponse.json({ ok: true });
          }
          case 'delete': {
            if (!bulkIds?.length) return missingField('id (array)');
            const count = await deleteAccountAccessGrants(bulkIds);
            return NextResponse.json({ ok: true, count });
          }
          case 'deleteAll': {
            const count = await deleteAllAccountAccessGrants();
            return NextResponse.json({ ok: true, count });
          }
          default:
            return unknownOperation(operation);
        }
      }

      // ======================================================================
      case 'authz_assets_access_grant': {
        switch (operation) {
          case 'insert': {
            if (!data || Array.isArray(data)) return missingField('data (object)');
            const newId = await insertAssetsAccessGrant(data as any);
            return NextResponse.json({ id: newId }, { status: 201 });
          }
          case 'updateOne': {
            if (!singleId) return missingField('id (string)');
            if (!data || Array.isArray(data)) return missingField('data (object)');
            await updateAssetsAccessGrant(singleId, data as any);
            return NextResponse.json({ ok: true });
          }
          case 'update': {
            if (!Array.isArray(data)) return missingField('data (array)');
            await Promise.all(
              (data as any[]).map(({ id: rid, ...rest }) => updateAssetsAccessGrant(rid, rest)),
            );
            return NextResponse.json({ ok: true, count: data.length });
          }
          case 'deleteOne': {
            if (!singleId) return missingField('id (string)');
            await deleteAssetsAccessGrant(singleId);
            return NextResponse.json({ ok: true });
          }
          case 'delete': {
            if (!bulkIds?.length) return missingField('id (array)');
            const count = await deleteAssetsAccessGrants(bulkIds);
            return NextResponse.json({ ok: true, count });
          }
          case 'deleteAll': {
            const count = await deleteAllAssetsAccessGrants();
            return NextResponse.json({ ok: true, count });
          }
          default:
            return unknownOperation(operation);
        }
      }

      // ======================================================================
      default:
        return NextResponse.json(
          {
            error: `Unknown table: "${table}". Valid values: authz_role_capability, authz_account_access_grant, authz_assets_access_grant.`,
          },
          { status: 400 },
        );
    }
  } catch (err: any) {
    await logProblem(err, `bridge/webhook.v1/authz/role [${table}:${operation}]`);
    return NextResponse.json({ error: err.message ?? 'Internal server error.' }, { status: 500 });
  }
}

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
