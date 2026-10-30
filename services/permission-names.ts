export const PERMISSIONS = {
  public: {
    createAgency: 'public.create_agency',
    mortgageRequest: 'public.mortgage.request',
    propertyInquire: 'public.property.inquire',
    propertySave: 'public.property.save',
    requirementCreate: 'public.requirement.create',
  },
  manage: {
    accountView: 'account.view',
    accountUpdate: 'account.update',
    accountUpdateDelete: 'account.update.delete',
    accountUpdateDeactivate: 'account.update.deactivate',
    agentMapView: 'manage.agent_map.view',
    analyticsView: 'analytics.view',
    dashboardView: 'dashboard.view',
    intelligenceListingsView: 'manage.intelligence.listings.view',
    notificationView: 'manage.notification.view',
    locationsManage: 'manage.locations.manage',
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

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]];
