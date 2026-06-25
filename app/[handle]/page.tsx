import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { SafeImage } from '@/components/safe-image';
import { Building, Home, Users } from 'lucide-react';
import { getPublicAccountProfileByNeupId } from '@/services/agency-service';

function resolveNeupId(handle: string) {
  const decodedHandle = decodeURIComponent(handle);
  if (!decodedHandle.startsWith('@')) return null;
  const neupId = decodedHandle.slice(1).trim();
  return neupId.length > 0 ? neupId : null;
}

export default async function PublicAgencyProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const neupId = resolveNeupId(handle);
  if (!neupId) notFound();

  const account = await getPublicAccountProfileByNeupId(neupId);
  if (!account) notFound();

  const isAgency = ['brand', 'branch'].includes(account.accountType);

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <SafeImage
              src={account.logoUrl}
              alt={`${account.name} logo`}
              width={96}
              height={96}
              className="h-20 w-20 rounded-lg border bg-white p-2 object-contain"
              fallbackSrc="https://placehold.co/96x96.png"
            />
            <div>
              <h1 className="text-4xl font-headline font-bold">{account.name}</h1>
              <p className="mt-2 text-muted-foreground">@{account.neupId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {isAgency ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Agents
                </div>
                <p className="mt-3 text-3xl font-semibold">{account.agentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-4 w-4 text-primary" />
                  Properties
                </div>
                <p className="mt-3 text-3xl font-semibold">{account.propertyCount}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="mt-8 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            Public profile page
          </div>
          {isAgency ? (
            <p className="mt-2">
              Use <span className="font-medium">/@{account.neupId}/agents</span> to view agents and <span className="font-medium">/@{account.neupId}/properties</span> to view properties.
            </p>
          ) : (
            <p className="mt-2">This profile is resolved by NeupID handle.</p>
          )}
        </div>
      </div>
    </main>
  );
}
