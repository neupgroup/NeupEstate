# Agency Management Refactor

## Overview
Refactored the agency management system to use a single `/manage/agency` page that fetches brand accounts from NeupID and allows creating or syncing them to the local database.

## Changes Made

### New Files Created

1. **`/app/manage/agency/page.tsx`**
   - Main page that fetches brand accounts from NeupID API
   - Queries local database to check which accounts already exist
   - Displays brand accounts as cards with appropriate actions

2. **`/app/manage/agency/brand-account-card.tsx`**
   - Client component that displays each brand account as a card
   - Shows account details: name, type, status, verification, capabilities
   - Displays account image
   - Shows "Create Agency" button for new accounts
   - Shows "Sync Changes" button for existing accounts (when data differs)
   - Shows "Up to Date" button (disabled) when account is synced
   - Handles loading states and error messages

3. **`/app/manage/agency/actions.ts`**
   - Server actions for creating and syncing accounts
   - `createAccountAction`: Creates a new account in local database
   - `syncAccountAction`: Updates displayName and displayImage for existing accounts

### Files Modified

1. **`/app/manage/settings/page.tsx`**
   - Updated link from `/manage/agencies` to `/manage/agency`

2. **`/app/actions.ts`**
   - Updated revalidatePath calls from `/manage/agencies` to `/manage/agency`

### Navigation
The sidebar navigation in `/app/manage/layout.tsx` already had the correct `/manage/agency` link, so no changes were needed there.

## How It Works

1. **Page Load**:
   - Fetches all brand accounts from NeupID API using `getBrandAccounts()`
   - Queries local database for existing accounts with matching IDs
   - Creates a map of existing accounts for quick lookup

2. **Display**:
   - Shows brand accounts in a responsive grid (1-3 columns)
   - Each card shows account information and current sync status
   - Green border and "Exists" badge for accounts already in database

3. **Create Action**:
   - Available for brand accounts not yet in local database
   - Creates new Account record with:
     - `id`: Brand account ID
     - `accountType`: From brand account
     - `displayName`: From brand account
     - `displayImage`: From brand account
     - `registered`: Set to true

4. **Sync Action**:
   - Available for existing accounts
   - Updates `displayName` and `displayImage` to match NeupID data
   - Updates `accessedOn` timestamp
   - Button shows "Sync Changes" when data differs
   - Button shows "Up to Date" (disabled) when data matches

## Benefits

- **Single Page**: No separate create/select pages needed
- **Clear Status**: Visual indication of which accounts exist locally
- **Easy Sync**: One-click sync to update account information
- **Better UX**: All brand accounts visible at once with clear actions
- **Automatic Detection**: Automatically detects when sync is needed

## Old Structure (Can be removed)

The following directories/files are now obsolete:
- `/app/manage/agencies/` (entire directory)
- `/app/manage/agencies/create/`
- `/app/manage/agencies/select-brand/`
- `/app/manage/agencies/[id]/`

Note: Keep the old structure for now if there are any agency detail/edit pages that are still needed. Only the listing and creation flow has been replaced.
