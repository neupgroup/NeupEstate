# Properties API Guide

**Canonical Endpoint:** `GET /bridge/api.v1/property/list`

Legacy aliases:
- `GET /bridge/api.v1/properties`
- `GET /bridge/api.v1/property`

This endpoint returns active properties for either:
- a linked agency: `?agency_id=<accountId>`
- a direct agent account: `?account_id=<accountId>`

Legacy aliases are still accepted for compatibility:
- `?agency=<accountId>`
- `?agent=<accountId>`

## Why this endpoint exists

The public bridge API needs one stable way to fetch properties by ownership context.
The route delegates all filtering and field selection to the property service so the same rules are reused across the app.

## Implementation Flow

1. Read query params from `req.nextUrl.searchParams`.
2. Resolve exactly one owner filter:
   - `agency_id` or `agency`
   - `account_id` or `agent`
3. Reject requests that provide neither or both filters.
4. Parse optional pagination and field selection params:
   - `fields=id,title,price`
   - `limit=20`
   - `offset=0`
5. Call `getBridgePropertiesByAccount()` from `services/property-service.ts`.
6. Return a JSON payload with:
   - `success`
   - `filter`
   - `properties`
   - `totalCount`
   - `limit`
   - `offset`
   - `fields`

## Query Parameters

### Required

Exactly one of these must be present:
- `agency_id`
- `account_id`

### Optional

- `fields`: comma-separated property fields to return
- `limit`: page size, clamped to `1..100`
- `offset`: zero-based offset

## Response Shape

Successful response:

```json
{
  "success": true,
  "filter": { "type": "agency", "accountId": "acc_123" },
  "properties": [],
  "totalCount": 0,
  "limit": 20,
  "offset": 0,
  "fields": ["id", "slug", "title", "price"]
}
```

Error response:

```json
{
  "success": false,
  "error": "Provide either agency_id or account_id."
}
```

## Service Layer

The route uses `getBridgePropertiesByAccount()` in [services/property-service.ts](../../../../services/property-service.ts).

That service:
- applies the `agencyId` or `agentId` filter
- excludes inactive properties by default
- applies pagination
- maps records into the public bridge property shape
- restricts returned fields to the requested allowlist

## Notes For Implementers

- Keep the route thin. Put filtering and serialization in the service layer.
- If you add new returnable property fields, update the bridge field allowlist in `services/property-service.ts`.
- If you add a new ownership concept, add a new query param instead of overloading `agency_id` or `account_id`.
- The `/manage/agentmap` page is protected by `PERMISSIONS.manage.agentMapView`, but this API route is currently public.

## Example Requests

```bash
curl "http://localhost:3000/bridge/api.v1/property/list?agency_id=acc_123"
curl "http://localhost:3000/bridge/api.v1/property/list?account_id=acc_456&fields=id,title,price&limit=10&offset=0"
```
