# Logica Account

Shared account-facing helpers that talk to the Neup auth bridge using the
application credentials stored in environment variables.

## Documentation

- `guide.md`: canonical account, access, role, and permission modeling guide for other apps.

## Environment

- `NEUP_APP_ID`
- `NEUP_APP_SECRET`
- `NEUP_AUTH_URL`

## Available Helpers

- `connection.ts`: connected-account identity and `sign&get` helpers.
- `accounts.ts`: account listing, lookup, connection creation, and
  `roles/assign.me` helpers.
- `profile.ts`: profile and permission helpers.
- `access.ts`: connection/team access helpers.
- `team.ts`: unified team-member helper for application or connection lookups.
- `application.ts`: application export and app catalog sync helpers.
- `branding.ts`: branding helpers.

## Notes

- This module does not use fallback URLs or alternate environment variable
  names.
- The target application must expose `accountId`, `displayName`, and
  `displayImage` through its configured bridge response fields when using the
  connection identity helpers.
