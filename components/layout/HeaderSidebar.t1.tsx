// Filetype: typescript
// Layout component consisting of the header and management-style sidebar.

"use client";

import type { ReactNode } from "react";
import Header from "./Header.t1";
import Sidebar from "../elements/Sidebar.t1";

type HeaderSidebarProps = {
  children: ReactNode;
  canDashboard?: boolean;
  canAnalytics?: boolean;
  canIntelListings?: boolean;
  canPropertyView?: boolean;
  canCollectionView?: boolean;
  canLeadsView?: boolean;
  canClientsView?: boolean;
  canReviewsView?: boolean;
  canFaqView?: boolean;
  canAgentMapView?: boolean;
  canNotificationView?: boolean;
};

export default function HeaderSidebar({
  children,
  ...sidebarProps
}: HeaderSidebarProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr] items-start">
          <Sidebar {...sidebarProps} />
          <main className="py-8 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
