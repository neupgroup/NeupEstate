import { ClientLink } from '@/components/client-link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAgencyCustomizationsForAgency, getAgencyMapByAccount, getAgencyMapsByAgency } from '@/services/agency-customization-service';
import { requireAuth } from '@/services/auth/account';
import { getAccountById } from '@/services/account-service';
import { AlertCircle, ArrowLeft, Building2, Settings2, UsersRound } from 'lucide-react';

type SearchParams = Record<string, string | string[] | undefined>;

async function getSelectedAgency(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.selectedAgency;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

async function getAgencyAccessContext(accountId: string, searchParams?: Promise<SearchParams>) {
  const selectedAgency = await getSelectedAgency(searchParams);
  const membership = await getAgencyMapByAccount(accountId);
  const selectedAgencyMembers = selectedAgency
    ? await getAgencyMapsByAgency(selectedAgency)
    : [];

  const selectedAgencyIsAllowed =
    selectedAgency === null ||
    selectedAgency === accountId ||
    membership?.agencyAccountId === selectedAgency ||
    selectedAgencyMembers.some((member) => member.accountId === accountId);

  const agencyAccountId =
    selectedAgencyIsAllowed && selectedAgency
      ? selectedAgency
      : membership?.agencyAccountId ?? accountId;

  return {
    agencyAccountId,
    isSelectedAgencyAllowed: selectedAgencyIsAllowed,
    selectedAgency,
  };
}

function FieldList({
  title,
  fields,
  emptyLabel,
}: {
  title: string;
  fields: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          {fields.length} field{fields.length === 1 ? '' : 's'}
        </p>
      </div>
      {fields.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <Badge key={field} variant="outline" className="font-normal">
              {field}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export default async function ManageCustomizationPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const authAccount = await requireAuth();
  const { agencyAccountId, isSelectedAgencyAllowed, selectedAgency } = await getAgencyAccessContext(
    authAccount.aid,
    searchParams,
  );

  const [agencyAccount, agencyMembers, customizations] = await Promise.all([
    getAccountById(agencyAccountId),
    getAgencyMapsByAgency(agencyAccountId),
    getAgencyCustomizationsForAgency(agencyAccountId),
  ]);

  const propertyCustomization =
    customizations.find((entry) => entry.customizeFor === 'property') ?? null;
  const leadCustomization =
    customizations.find((entry) => entry.customizeFor === 'lead') ?? null;

  const agencyDisplayName = agencyAccount?.display_name ?? agencyAccountId;
  const backHref = selectedAgency
    ? `/manage/agency?selectedAgency=${encodeURIComponent(agencyAccountId)}`
    : '/manage/agency';

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <ClientLink
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agency management
        </ClientLink>

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Customization</h2>
          <Badge variant="secondary">
            <Building2 className="mr-1 h-3.5 w-3.5" />
            {agencyDisplayName}
          </Badge>
          <Badge variant="outline">
            <UsersRound className="mr-1 h-3.5 w-3.5" />
            {agencyMembers.length + 1} members
          </Badge>
        </div>

        <p className="max-w-3xl text-sm text-muted-foreground">
          Review the current agency-specific field rules used by property and lead workflows.
          These rules are enforced on top of the default form validation already present in the app.
        </p>
      </div>

      {!isSelectedAgencyAllowed && selectedAgency ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Selected agency was reset</AlertTitle>
          <AlertDescription>
            You do not have access to the requested agency, so customization was loaded for your
            default agency instead.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Property Rules
            </CardTitle>
            <CardDescription>
              Additional required and optional fields for property create and edit flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldList
              title="Required"
              fields={propertyCustomization?.customization.required ?? []}
              emptyLabel="No extra required property fields are configured."
            />
            <FieldList
              title="Optional"
              fields={propertyCustomization?.customization.optional ?? []}
              emptyLabel="No optional property hints are configured."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Lead Rules
            </CardTitle>
            <CardDescription>
              Additional required and optional fields for lead capture and qualification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldList
              title="Required"
              fields={leadCustomization?.customization.required ?? []}
              emptyLabel="No extra required lead fields are configured."
            />
            <FieldList
              title="Optional"
              fields={leadCustomization?.customization.optional ?? []}
              emptyLabel="No optional lead hints are configured."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current State</CardTitle>
            <CardDescription>
              Quick status summary for this agency’s stored customization profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Property rule saved</span>
              <Badge variant={propertyCustomization ? 'default' : 'outline'}>
                {propertyCustomization ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Lead rule saved</span>
              <Badge variant={leadCustomization ? 'default' : 'outline'}>
                {leadCustomization ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Total customization entries</span>
              <span className="font-medium">{customizations.length}</span>
            </div>
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              This page is read-only for now. It reflects the current rules already used by the
              property and lead flows.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
