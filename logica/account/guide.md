# Account Logic Guide

::neup.documentation::neup-logica-account-guide
::title Account, Access, Role, and Permission Guide

Canonical guide for how other Neup apps should model account ownership, access, roles, and permissions against the current schema.

::public

Use this guide when another app needs to:

- store an account identity
- reference a Neup account from app-local data
- assign one account access to another account, connection, or application
- manage roles and permissions through the authz catalog

This guide reflects the current Prisma schema in `prisma/schema.prisma`.

::public end

::private

`access.guide.md` still contains older portfolio-era fields and should not be treated as the source of truth for account/app integrations.

::private end

::end

## Purpose

For other apps, the safest model is:

1. Keep `neup.account` as the identity source of truth.
2. Reference `Account.id` from other apps instead of duplicating account records in every app database.
3. Use `Member`, `Asset`, and `Access` to describe who can act on what.
4. Use `AuthzPermission`, `AuthzRole`, and `AuthzRolePermissionMap` to describe what a grant allows.

If an app needs more app-specific profile data, that data should live in app-owned tables keyed by `account_id`, not by expanding the shared `account` table for every product-specific field.

## 1. Shared `account` Table

The current shared account table is `Account` mapped to the database table `account`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. This is the global account identifier other apps should store. |
| `displayName` | `string` | no | Human-readable display label. |
| `accountType` | `string` | yes | Defaults to `individual`. Current system uses values like `individual` and brand-oriented variants. |
| `displayImage` | `string` | no | Profile or brand image URL/path. |
| `status` | `string` | no | Lifecycle status. Keep explicit values in app logic, such as `active`, `blocked`, `disabled`, or `pending`. |
| `isVerified` | `boolean` | yes | Defaults to `false`. Indicates account-level verification state. |
| `details` | `json` | no | Flexible metadata for shared account-level details that do not justify a first-class column. |
| `createdAt` | `datetime` | yes | Creation timestamp. |
| `linkedAccountId` | `uuid` | no | Optional self-reference for linked-account scenarios. |

### Recommended rule for other apps

If another app needs an account table in its own database, keep it minimal:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `account_id` | `uuid` | yes | Foreign key or external reference to `neup.account.account.id`. |
| `status` | `string` | yes | App-local state for that app only. |
| `created_at` | `datetime` | yes | Local record creation time. |
| `updated_at` | `datetime` | yes | Local record update time. |
| `details` | `json` | no | App-local metadata. |

Do not duplicate shared identity fields unless the app explicitly needs a denormalized cache. If it does, treat cached fields like `display_name` or `display_image` as derived data, not the source of truth.

## 2. Optional Type-Specific Profile Tables

The shared schema already separates type-specific data:

### `account_individual`

Use for person-specific attributes:

- `accountId`
- `firstName`
- `middleName`
- `lastName`
- `dateOfBirth`
- `countryOfResidence`
- `details`

### `account_brand`

Use for brand/company-specific attributes:

- `accountId`
- `brandName`
- `isLegalEntity`
- `originCountry`
- `details`

Other apps should follow the same pattern: keep shared identity in `account`, and put domain-specific profile data in a separate table keyed by `account_id`.

## 3. `member` Table

`Member` defines who belongs under a parent account context.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `memberType` | `string` | yes | Current account model uses `acc_self` and `acc_in_acc`. |
| `memberAccountId` | `uuid` | no | Child account receiving membership. `null` for self membership rows. |
| `parentAccountId` | `uuid` | no | Parent account that owns or governs the context. |
| `status` | `string` | yes | Defaults to `active`. |
| `isTemporary` | `datetime` | no | Expiry timestamp for temporary membership. |
| `details` | `json` | no | Extra membership metadata. |

### Usage rules

- Use `acc_self` when an account is acting on itself.
- Use `acc_in_acc` when one account is a managed child/member under another account.
- Create `Member` before creating an `Access` row.

## 4. `assets` Table

`Asset` defines what resource exists under a parent account.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `access_type` | enum | yes | `acc_in_acc`, `conn_in_acc`, or `app_in_acc`. |
| `member_account_id` | `uuid` | no | Child account when the asset is another account. |
| `member_connection_id` | `uuid` | no | Child connection when the asset is a connection. |
| `access_application_id` | `uuid` | no | Child application when the asset is an application. |
| `parent_account_id` | `uuid` | no | Parent account that owns the asset context. |
| `isTemporary` | `datetime` | no | Expiry timestamp for temporary assets. |
| `status` | `string` | yes | Defaults to `active`. |
| `details` | `json` | no | Extra asset metadata. |

### Usage rules

- Use `acc_in_acc` for account-under-account assets.
- Use `conn_in_acc` for connection-under-account assets.
- Use `app_in_acc` for application-under-account assets.
- Create `Asset` before creating an `Access` row.

## 5. `access` Table

`Access` is the denormalized grant table. It ties one member to one asset through one role.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `accessType` | enum | yes | `acc_self`, `acc_self.root`, `acc_in_acc`, `conn_in_acc`, or `app_in_acc`. |
| `memberId` | `uuid` | yes | FK to `member.id`. |
| `memberAccountId` | `uuid` | no | Denormalized child account from `member`. |
| `parentAccountId` | `uuid` | no | Denormalized parent account context. |
| `assetId` | `uuid` | yes | FK to `assets.id`. |
| `assetAccountId` | `uuid` | no | Denormalized asset child account. |
| `assetConnectionId` | `uuid` | no | Denormalized asset connection. |
| `assetApplicationId` | `uuid` | no | Denormalized asset application. |
| `accessApplicationId` | `uuid` | no | Application that owns the role/grant context when relevant. |
| `isTemporary` | `datetime` | no | Expiry timestamp for temporary grants. |
| `roleId` | `uuid` | yes | FK to `authz_role.id`. |
| `status` | `string` | yes | Defaults to `active`. |
| `details` | `json` | no | Extra grant metadata. |

### Usage rules

- `accessType` should match the logical grant shape.
- Self access uses `acc_self` or `acc_self.root`.
- Non-self access uses the same relationship shape as the asset.
- This is the main lookup table other apps should query when they need to answer: "Does account X have role Y over resource Z?"

## 6. `authz_permission` Table

`AuthzPermission` is the canonical permission catalog.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `name` | `string` | yes | Canonical permission name, for example `application.view`. |
| `description` | `string` | no | Human-readable meaning. |
| `appId` | `uuid` | no | App that owns the permission namespace. |
| `scopeFor` | `json` | no | Audience/applicability policy. |
| `scopeLevel` | `json` | no | Enrollment/assignment scope policy. |
| `acquisitionType` | `string` | no | How permission is acquired, default `assignment`. |
| `approvalPolicy` | `string` | no | Approval behavior, default `none`. |
| `rules` | `string` | no | Optional rule expression or notes. |
| `status` | `string` | no | Optional lifecycle state. |
| `tag` | `json` | no | Optional metadata. |

### Usage rules

- Permissions are app-scoped capabilities.
- Keep permission names stable and machine-friendly.
- Other apps should register permissions here instead of hiding permission lists inside UI code.

## 7. `authz_role` Table

`AuthzRole` defines reusable bundles of permissions.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `name` | `string` | yes | Role name unique within an app. |
| `description` | `string` | no | Human-readable meaning. |
| `appId` | `uuid` | no | Owning application. |
| `scopeFor` | `json` | yes | Audience/applicability policy. |
| `scopeLevel` | `string` | yes | Current schema stores one primary scope level, default `assignable`. |
| `acquisitionType` | `string` | yes | Default `assignment`. |
| `approvalPolicy` | `string` | yes | Default `none`. |
| `pushed` | `boolean` | yes | Sync/push status for downstream app authz integration. |
| `applicableFor` | `json` | yes | Role applicability metadata. |
| `permissions` | `json` | no | Denormalized permission snapshot. |

### Usage rules

- Assign roles in `access.roleId`.
- Treat `permissions` as a denormalized helper, not the only source of truth.
- The normalized permission-to-role relationship lives in `authz_role_permission_map`.

## 8. `authz_role_permission_map` Table

This is the normalized join table between roles and permissions.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `roleId` | `uuid` | yes | FK to `authz_role.id`. |
| `permissionId` | `uuid` | yes | FK to `authz_permission.id`. |
| `scopeFor` | `string` | yes | Scope audience for this role-permission mapping. |
| `scopeLevel` | `string` | yes | Scope level for this role-permission mapping. |
| `createdAt` | `datetime` | yes | Creation timestamp. |

### Usage rules

- Use this table when you need exact, normalized permission membership for a role.
- Keep `authz_role.permissions` in sync as the denormalized read model if that snapshot is still required by downstream systems.

## 9. Legacy `role` Table

The schema still contains a legacy denormalized `role` table mapped as `Role`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key. |
| `memberId` | `uuid` | yes | FK to `member.id`. |
| `accountId` | `uuid` | no | Denormalized account context. |
| `connectionId` | `uuid` | no | Denormalized connection context. |
| `assetId` | `uuid` | no | Denormalized asset context. |
| `assetType` | `string` | no | Legacy asset type snapshot. |
| `assetIdDenorm` | `string` | no | Additional denormalized identifier. |
| `roleId` | `uuid` | yes | FK to `authz_role.id`. |
| `roleName` | `string` | no | Legacy denormalized role name. |
| `permissions` | `json` | no | Legacy denormalized permission snapshot. |
| `status` | `string` | yes | Defaults to `active`. |
| `details` | `json` | no | Extra metadata. |

### Rule

For new work, prefer `access` plus `authz_role`. Only rely on the legacy `role` table where older code paths still require it.

## 10. Suggested Integration Flow for Other Apps

When another app needs account-aware authorization:

1. Create or reference the shared `account` row.
2. Create any app-local account profile table keyed by `account_id`.
3. Register app permissions in `authz_permission`.
4. Create app roles in `authz_role`.
5. Link roles to permissions in `authz_role_permission_map`.
6. When granting access, create or resolve the `member` row.
7. Create or resolve the `asset` row.
8. Create the `access` row with the selected `roleId`.

## 11. Service-Layer Rule

Keep account and access logic in `services/...`, not in UI components.

Recommended service shape:

- `getAccountInfo(accountId)`
- `getMyInfo()`
- `getAccountAccess(accountId, parentAccountId)`
- `grantAccountAccess(input)`
- `getRolePermissions(roleId)`

`getMyInfo()` should be a thin wrapper over `getAccountInfo(accountId)` using the current authenticated account context.
