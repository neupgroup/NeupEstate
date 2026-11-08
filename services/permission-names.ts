export const PERMISSIONS = {
  estate: {
    agency: {
      create: 'estate.agency.create',
      modify: 'estate.agency.modify',
      dropInitiate: 'estate.agency.drop.initiate',
      dropConfirm: 'estate.agency.drop.confirm',
    },
    mortgageRequests: {
      create: 'estate.mortgage.requests.create',
      view: 'estate.mortgage.requests.view',
      assign: 'estate.mortgage.requests.assign',
      serve: 'estate.mortgage.requests.serve',
      drop: 'estate.mortgage.requests.drop',
    },
    property: {
      create: 'estate.property.create',
      update: 'estate.property.update',
      drop: 'estate.property.drop',
      transfer: 'estate.property.transfer',
      view: 'estate.property.view',
      convertToListing: 'estate.property.convert.toListing',
      duplicate: 'estate.property.duplicate',
    },
    listing: {
      save: 'estate.listing.save',
      create: 'estate.listing.create',
      update: 'estate.listing.update',
      drop: 'estate.listing.drop',
      transfer: 'estate.listing.transfer',
      view: 'estate.listing.view',
      duplicate: 'estate.listing.duplicate',
      approvalView: 'estate.listing.approval.view',
      approvalUpdate: 'estate.listing.approval.update',
    },
    requirement: {
      create: 'estate.requirement.create',
      view: 'estate.requirement.view',
      update: 'estate.requirement.update',
    },
  },
  crm: {
    lead: {
      create: 'crm.lead.create',
      view: 'crm.lead.view',
      activityView: 'crm.lead.activity.view',
      assignment: 'crm.lead.assignment',
      assignmentRemoveSelf: 'crm.lead.assignment.removeSelf',
      activityAdd: 'crm.lead.activity.add',
      todoAdd: 'crm.lead.todo.add',
      remainderAdd: 'crm.lead.remainder.add',
      archieve: 'crm.lead.archieve',
    },
    baseLead: {
      view: 'crm.baseLead.view',
      leadsView: 'crm.baseLead.leads.view',
      leadsActivityView: 'crm.baseLead.leads.activity.view',
      leadsActivityAdd: 'crm.baseLead.leads.activity.add',
    },
  },
  public: {
    propertyInquire: 'public.property.inquire',
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
    selfReviewsView: 'manage.self.reviews.view',
  },
  root: {
    listingsView: 'root.listings.view',
    propertyLog: 'root.property.log',
  },
} as const;

type PermissionValue<T> = T extends string ? T : T extends object ? PermissionValue<T[keyof T]> : never;

export type PermissionName = PermissionValue<typeof PERMISSIONS>;
