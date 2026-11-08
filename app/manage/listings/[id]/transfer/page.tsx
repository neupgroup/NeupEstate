import { notFound } from "next/navigation";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";

import { Link } from "@neup/components/ui/link";
import { ListingTransferForm } from "@/app/manage/listings/[id]/transfer/listing-transfer-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@neup/components/ui/card";
import { getListingAgentOptionsAction } from '@/services/listings/drafts';
import { hasPermission } from "@/services/permissions";
import { PERMISSIONS } from '@/services/permission-names';;
import { getPublicAgencyAccounts } from "@/services/agencies/agency/service";
import { requireAuth } from "@/services/auth/account";
import { getListingById } from "@/services/listings";

type PageProps = {
  params: Promise<{ id: string }>;
};

function getListingAgencyId(property: Awaited<ReturnType<typeof getListingById>>) {
  const agencyId = property?.agency?.id?.trim();
  return agencyId && agencyId !== "unknown" ? agencyId : null;
}

/*
::neup.documentation::manage-property-transfer-page

::private

`/manage/listings/[id]/transfer` is a focused listing-transfer page for an
existing property. It changes the listing agency and listing agent through a
pending property-change request. It returns 404 for a missing property or an authenticated account without
the required permissions.

::private end
::end
*/
export default async function TransferListingPage({ params }: PageProps) {
  await requireAuth();
  const [canUpdate, canTransfer] = await Promise.all([
    hasPermission(PERMISSIONS.estate.listing.update),
    hasPermission(PERMISSIONS.estate.listing.transfer),
  ]);
  if (!canUpdate || !canTransfer) notFound();

  const { id } = await params;
  const property = await getListingById(id, { includeInactive: true });
  if (!property) notFound();

  const currentAgencyId = getListingAgencyId(property);
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
      <Link
        href={`/manage/listings/${property.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        Back to Listing
      </Link>

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
          <ListingTransferForm
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
