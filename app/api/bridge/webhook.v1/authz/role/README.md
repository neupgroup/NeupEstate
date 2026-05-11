# Authorization Webhook API

**Endpoint:** `POST /api/bridge/webhook.v1/authz/role`

This webhook allows the neupgroup account module to manage authorization data across three tables:
- `authz_role_capability`
- `authz_account_access_grant`
- `authz_assets_access_grant`

## Authentication

All requests must include the shared secret in the header:

```
x-bridge-secret: <BRIDGE_WEBHOOK_SECRET>
```

Set `BRIDGE_WEBHOOK_SECRET` in your environment variables.

## Request Format

```json
{
  "table": "authz_role_capability | authz_account_access_grant | authz_assets_access_grant",
  "operation": "insert | updateOne | update | deleteOne | delete | deleteAll",
  "data": { ... } | [ ... ],
  "id": "uuid" | ["uuid", ...]
}
```

`id` is a plain string for single-record operations (`updateOne`, `deleteOne`) and an array of strings for bulk delete (`delete`).

---

## Operations

### `insert`
Insert a single record.

**Required:** `data` (object)

```json
{
  "table": "authz_role_capability",
  "operation": "insert",
  "data": {
    "roleId": "role-123",
    "capabilityId": "cap-456",
    "scope": "portfolio:abc",
    "roleName": "Admin"
  }
}
```

**Response:** `201 Created`
```json
{ "id": "new-uuid" }
```

---

### `updateOne`
Update a single record by ID.

**Required:** `id` (string), `data` (object)

```json
{
  "table": "authz_account_access_grant",
  "operation": "updateOne",
  "id": "grant-uuid",
  "data": {
    "roleId": "new-role-id",
    "portfolioId": "portfolio-xyz"
  }
}
```

**Response:** `200 OK`
```json
{ "ok": true }
```

---

### `update`
Bulk update multiple records. Each object in `data` must include an `id` field.

**Required:** `data` (array)

```json
{
  "table": "authz_assets_access_grant",
  "operation": "update",
  "data": [
    { "id": "grant-1", "roleId": "role-new" },
    { "id": "grant-2", "assetType": "property" }
  ]
}
```

**Response:** `200 OK`
```json
{ "ok": true, "count": 2 }
```

---

### `deleteOne`
Delete a single record by ID.

**Required:** `id` (string)

```json
{
  "table": "authz_role_capability",
  "operation": "deleteOne",
  "id": "cap-uuid"
}
```

**Response:** `200 OK`
```json
{ "ok": true }
```

---

### `delete`
Bulk delete multiple records.

**Required:** `id` (array of strings)

```json
{
  "table": "authz_account_access_grant",
  "operation": "delete",
  "id": ["grant-1", "grant-2", "grant-3"]
}
```

**Response:** `200 OK`
```json
{ "ok": true, "count": 3 }
```

### `deleteAll`
Delete every record in the table. No other fields needed.

```json
{
  "table": "authz_role_capability",
  "operation": "deleteAll"
}
```

**Response:** `200 OK`
```json
{ "ok": true, "count": 42 }
```

---

## Table Schemas

### `authz_role_capability`
```typescript
{
  roleId: string;
  capabilityId: string;
  scope?: string | null;
  denormalizedCapability?: object | null;
  roleName?: string | null;
}
```

### `authz_account_access_grant`
```typescript
{
  ownerAccountId: string;
  targetAccountId: string;
  roleId: string;
  portfolioId?: string | null;
}
```

### `authz_assets_access_grant`
```typescript
{
  assetId: string;
  accountId: string;
  roleId: string;
  portfolioId?: string | null;
  assetType?: string | null;
}
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid `x-bridge-secret` header |
| `400` | Missing required fields, invalid operation, or unknown table |
| `500` | Database or service error |

```json
{ "error": "Missing required field: `id (string)`." }
```
