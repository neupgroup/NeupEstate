import { notFound } from 'next/navigation';
import { Link } from '@neup/components/ui/link';
import { Avatar, AvatarFallback, AvatarImage } from '@neup/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { getPublicAgencyAccountByNeupId } from '@/services/agencies/agency/service';
import { getAgencyAgentAccountsByAgency } from '@/services/agencies/agent-maps/service';
import { AlertCircle, ArrowDown, Building2, Users } from 'lucide-react';
import { SafeImage } from '@/components/safe-image';

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
      <section className="bg-background">
        <div className="container mx-auto grid gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" /> Agency team
            </p>
            <h1 className="text-4xl font-headline font-bold tracking-tight sm:text-5xl lg:text-6xl">Meet the agents at {agency.name}.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Connect with the professionals on this agency team and find the right person to guide your property plans.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a href="#agency-agents" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Explore the team <ArrowDown className="h-4 w-4" />
              </a>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" /> {agents.length} {agents.length === 1 ? 'agent' : 'agents'} · @{agency.neupId}
              </span>
            </div>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-lg sm:min-h-[410px]">
            <SafeImage
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85"
              alt={`Office buildings representing ${agency.name}`}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              fallbackSrc="https://placehold.co/1200x900.png"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-sm font-medium text-white/80">Local knowledge, team experience</p>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">A team ready to help you move forward.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="agency-agents" className="bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
       <div className="container mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-headline font-bold">{agency.name} Agents</h2>
          <p className="mt-2 text-muted-foreground">Browse the professionals who are part of this agency.</p>
        </div>
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {agents.map((agent) => {
              const displayName = agent.display_name || agent.id;
              const profileHref = agent.neup_id?.trim() ? `/@${agent.neup_id.trim()}` : null;
              return (
                <Card key={agent.id} className="bg-card text-card-foreground transition-shadow hover:shadow-lg">
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
            <AlertDescription>This agency does not have any agents yet.</AlertDescription>
          </Alert>
        )}
       </div>
      </section>
    </main>
  );
}
