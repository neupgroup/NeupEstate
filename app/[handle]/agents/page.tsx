import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getPublicAgencyAccountByNeupId } from '@/services/agency-service';
import { getAgencyAgentAccountsByAgency } from '@/services/agency-agent-map-service';
import { AlertCircle, Users } from 'lucide-react';

function resolveNeupId(handle: string) {
  const decodedHandle = decodeURIComponent(handle);
  if (!decodedHandle.startsWith('@')) return null;
  const neupId = decodedHandle.slice(1).trim();
  return neupId.length > 0 ? neupId : null;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function PublicAgencyAgentsPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const neupId = resolveNeupId(handle);
  if (!neupId) notFound();

  const agency = await getPublicAgencyAccountByNeupId(neupId);
  if (!agency) notFound();

  const agents = await getAgencyAgentAccountsByAgency(agency.id);

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="flex items-center gap-3 text-4xl font-headline font-bold">
            <Users className="h-8 w-8 text-primary" />
            {agency.name} Agents
          </h1>
          <p className="mt-2 text-muted-foreground">@{agency.neupId}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
              const displayName = agent.display_name || agent.id;
              const profileHref = agent.neup_id?.trim() ? `/@${agent.neup_id.trim()}` : null;
              return (
                <Card key={agent.id}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={agent.display_image || undefined} alt={displayName} />
                        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {profileHref ? (
                            <Link href={profileHref} className="hover:underline">
                              {displayName}
                            </Link>
                          ) : (
                            displayName
                          )}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground capitalize">{agent.account_type}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Agents Found</AlertTitle>
            <AlertDescription>This agency does not have any public agents yet.</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
