/*
::neup.documentation::service-permissions
::title Service-Owned Permission API

Reads the current app's synced authz data and answers permission checks for the
current authenticated account.

::public

Use this service instead of `@/logica/auth/*` inside this app. It resolves the
current app id, reads permission data from `authz_role` and `account_access`,
and exposes permission checks for pages, layouts, and server actions.

::public end

::private

Permission names are normalized so older prefixed role payloads like
`NeupEstate.660724c77.manage-dashboard-view` still match the canonical dotted
names used by the app.

::private end

::end
*/

import { notFound } from 'next/navigation';
import { prisma } from '@/core/database/prisma';
import { getAuthenticatedAccount } from '@/services/auth';

export const PERMISSIONS = {
  public: {
    contactPost: 'public.contact.post',
    createAgency: 'public.create_agency',
    mortgageRequest: 'public.mortgage.request',
    propertyInquire: 'public.property.inquire',
    propertySave: 'public.property.save',
    requirementCreate: 'public.requirement.create',
  },
  manage: {
    accountsView: 'manage.accounts.view',
    agentMapView: 'manage.agent_map.view',
    analyticsView: 'manage.analytics.view',
    dashboardView: 'manage.dashboard.view',
    faqCreate: 'manage.faq.create',
    faqDelete: 'manage.faq.delete',
    faqUpdate: 'manage.faq.update',
    faqView: 'manage.faq.view',
    intelligenceListingsView: 'manage.intelligence.listings.view',
    notificationView: 'manage.notification.view',
    propertyCollectionSelfView: 'manage.property_collection.self.view',
    propertyReviewApprove: 'manage.property.review.approve',
    propertyReviewView: 'manage.property.review.view',
    propertySelfCreate: 'manage.property.self.create',
    propertySelfDelete: 'manage.property.self.delete',
    propertySelfTransfer: 'manage.property.self.transfer',
    propertySelfUpdate: 'manage.property.self.update',
    propertySelfView: 'manage.property.self.view',
    selfLeadAddActivity: 'manage.self.lead.add_activity',
    selfLeadCreate: 'manage.self.lead.create',
    selfLeadView: 'manage.self.lead.view',
    selfReviewsView: 'manage.self.reviews.view',
  },
  root: {
    propertiesView: 'root.properties.view',
    propertyLog: 'root.property.log',
  },
} as const;

type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];

type ManageLayoutPermissionState = {
  canDashboard: boolean;
  canAnalytics: boolean;
  canIntelListings: boolean;
  canPropertyView: boolean;
  canRootPropertiesView: boolean;
  canCollectionView: boolean;
  canAccountsView: boolean;
  canLeadsHomeView: boolean;
  canLeadsBaseView: boolean;
  canLeadsMyView: boolean;
  canLeadsSharedView: boolean;
  canLeadsAlertsView: boolean;
  canReviewsView: boolean;
  canFaqView: boolean;
  canAgentMapView: boolean;
  canNotificationView: boolean;
};

function getCurrentAppId(): string {
  const appId = process.env.NEUP_APP_ID?.trim();
  if (!appId) {
    throw new Error('NEUP_APP_ID is required.');
  }
  return appId;
}

function normalizePermissionName(permission: string, appId: string): string {
  const trimmed = permission.trim();
  if (!trimmed) return '';

  const withoutPrefix = trimmed.startsWith(`${appId}.`)
    ? trimmed.slice(appId.length + 1)
    : trimmed;

  return withoutPrefix.replace(/-/g, '.');
}

function coercePermissionList(value: unknown, appId: string): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => normalizePermissionName(entry, appId))
    .filter(Boolean);
}

function toPermissionSet(values: string[]): Set<string> {
  return new Set(values.filter(Boolean));
}

async function getCurrentAccountId(): Promise<string | null> {
  const authResult = await getAuthenticatedAccount();
  if (!authResult.success || !authResult.account.aid) return null;
  return authResult.account.aid;
}

export async function getCurrentAppPermissionNames(): Promise<string[]> {
  const appId = getCurrentAppId();

  const roles = (await prisma.authzRole.findMany({
    where: { appId },
    select: { permissions: true },
  })) as Array<{ permissions: unknown }>;

  const permissions: string[] = [];
  for (const role of roles) {
    permissions.push(...coercePermissionList(role.permissions, appId));
  }

  return Array.from(toPermissionSet(permissions)).sort();
}

export async function getCurrentAccountPermissionNames(): Promise<string[]> {
  const appId = getCurrentAppId();
  const accountId = await getCurrentAccountId();
  if (!accountId) return [];

  const accessRows = (await prisma.accountAccess.findMany({
    where: {
      accountId,
      appId,
    },
    select: {
      role: {
        select: {
          permissions: true,
        },
      },
    },
  })) as Array<{ role: { permissions: unknown } }>;

  const permissions: string[] = [];
  for (const row of accessRows) {
    permissions.push(...coercePermissionList(row.role.permissions, appId));
  }

  return Array.from(toPermissionSet(permissions)).sort();
}

export async function hasPermission(permission: PermissionName | string): Promise<boolean> {
  const appId = getCurrentAppId();
  const [currentAppPermissions, currentAccountPermissions] = await Promise.all([
    getCurrentAppPermissionNames(),
    getCurrentAccountPermissionNames(),
  ]);

  const requestedPermission = normalizePermissionName(permission, appId);
  if (!requestedPermission) return false;

  const currentAppPermissionSet = toPermissionSet(currentAppPermissions);
  if (!currentAppPermissionSet.has(requestedPermission)) {
    return false;
  }

  return toPermissionSet(currentAccountPermissions).has(requestedPermission);
}

export async function requirePermission(permission: PermissionName | string): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export async function requirePagePermission(permission: PermissionName | string): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    notFound();
  }
}

export async function canShowManagePanelLink(): Promise<boolean> {
  const [currentAppPermissions, currentAccountPermissions] = await Promise.all([
    getCurrentAppPermissionNames(),
    getCurrentAccountPermissionNames(),
  ]);

  const currentAppPermissionSet = toPermissionSet(currentAppPermissions);
  const currentAccountPermissionSet = toPermissionSet(currentAccountPermissions);

  for (const permission of currentAppPermissionSet) {
    if ((permission.startsWith('manage.') || permission.startsWith('root.')) && currentAccountPermissionSet.has(permission)) {
      return true;
    }
  }

  return false;
}

export async function getManageLayoutPermissionState(): Promise<ManageLayoutPermissionState> {
  const currentAccountPermissionSet = toPermissionSet(await getCurrentAccountPermissionNames());
  const has = (permission: string) => currentAccountPermissionSet.has(permission);

  return {
    canDashboard: has(PERMISSIONS.manage.dashboardView),
    canAnalytics: has(PERMISSIONS.manage.analyticsView),
    canIntelListings: has(PERMISSIONS.manage.intelligenceListingsView),
    canPropertyView: has(PERMISSIONS.manage.propertySelfView),
    canRootPropertiesView: has(PERMISSIONS.root.propertiesView),
    canCollectionView: has(PERMISSIONS.manage.propertyCollectionSelfView),
    canAccountsView: has(PERMISSIONS.manage.accountsView),
    canLeadsHomeView: has(PERMISSIONS.manage.selfLeadView),
    canLeadsBaseView: has(PERMISSIONS.manage.selfLeadView),
    canLeadsMyView: has(PERMISSIONS.manage.selfLeadView),
    canLeadsSharedView: has(PERMISSIONS.manage.selfLeadView),
    canLeadsAlertsView: has(PERMISSIONS.manage.selfLeadView),
    canReviewsView: has(PERMISSIONS.manage.selfReviewsView),
    canFaqView: has(PERMISSIONS.manage.faqView),
    canAgentMapView: has(PERMISSIONS.manage.agentMapView),
    canNotificationView: has(PERMISSIONS.manage.notificationView),
  };
}
