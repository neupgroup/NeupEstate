import { forbidden, notFound } from "next/navigation";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";

import { ClientLink } from "@/components/client-link";
import { PropertyTransferForm } from "@/app/manage/properties/[id]/transfer/property-transfer-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getListingAgentOptionsAction } from '@/services/property/drafts';
import { hasPermission } from "@/services/permissions";
import { PERMISSIONS } from "@/services/permissions";
import { getPublicAgencyAccounts } from "@/services/agency-service";
import { requireAuth } from "@/services/auth/account";
import { getPropertyById } from "@/services/property-service";

type PageProps = {
  params: Promise<{ id: string }>;
};

function getPropertyAgencyId(property: Awaited<ReturnType<typeof getPropertyById>>) {
  const agencyId = property?.agency?.id?.trim();
  return agencyId && agencyId !== "unknown" ? agencyId : null;
}

/*
::neup.documentation::manage-property-transfer-page

::private

`/manage/properties/[id]/transfer` is a focused listing-transfer page for an
existing property. It changes the listing agency and listing agent through a
pending property-change request. It returns 404 for a missing property and 403
for an authenticated account without the required permissions.

::private end
::end
*/
export default async function TransferPropertyPage({ params }: PageProps) {
  await requireAuth();
  const [canUpdate, canTransfer] = await Promise.all([
    hasPermission(PERMISSIONS.manage.propertySelfUpdate),
    hasPermission(PERMISSIONS.manage.propertySelfTransfer),
  ]);
  if (!canUpdate || !canTransfer) forbidden();

  const { id } = await params;
  const property = await getPropertyById(id, { includeInactive: true });
  if (!property) notFound();

  const currentAgencyId = getPropertyAgencyId(property);
  const currentAgentId = property.listingAgentId?.trim() || null;
  const [agencies, listingAgentsResult] = await Promise.all([
    getPublicAgencyAccounts({ limit: 250 }),
    getListingAgentOptionsAction({
      agencyId: currentAgencyId,
      currentAgentId,
    }),
  ]);
  const agencyOptions = agencies.map((agency) => ({
    id: agency.id,
    name: agency.name,
  }));
  const agentOptions = listingAgentsResult.success ? listingAgentsResult.agents : [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <ClientLink
        href={`/manage/properties/${property.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        Back to Property
      </ClientLink>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Transfer Listing</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {property.title || "Untitled property"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Listing Transfer Request
          </CardTitle>
          <CardDescription>
            Submitted listing agency and agent changes are saved as a pending property change and must be reviewed before publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyTransferForm
            propertyId={property.id}
            currentAgencyId={currentAgencyId}
            currentAgentId={currentAgentId}
            agencyOptions={agencyOptions}
            agentOptions={agentOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
