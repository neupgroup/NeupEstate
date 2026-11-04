import { getAgents } from "@/services/agents/agent/service";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@neup/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@neup/components/ui/alert";
import { SafeImage } from "@/components/estate";
import { Link } from "@neup/components/ui/link";
import { MapPin, AlertCircle, MessageSquare, ArrowDown, UsersRound } from "lucide-react";
import { Button } from "@neup/components/ui/button";
import { GuestSigninBanner } from "@/components/layout/guest-signin-banner";
import { getAuthenticatedMeData } from "@/services/auth/me";
import { NeupidMentions } from "@/components/neupid-mentions";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents({ limit: 100 });
  const me = await getAuthenticatedMeData();
  const showGuestBanner = me?.guest === true;

  return (
    <main className="flex-1">
      {showGuestBanner && <GuestSigninBanner variant="inline" />}
      <section className="bg-background">
        <div className="container mx-auto grid gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <UsersRound className="h-4 w-4" /> Local expertise, personal guidance
            </p>
            <h1 className="text-4xl font-headline font-bold tracking-tight sm:text-5xl lg:text-6xl">Find the right agent for your next move.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Meet real estate professionals who can help you explore listings, understand your options, and move forward with confidence.</p>
            <Link href="#agent-listings" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Explore our agents <ArrowDown className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-lg sm:min-h-[410px]">
            <SafeImage src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=85" alt="Real estate professionals discussing a property" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" fallbackSrc="https://placehold.co/1200x900.png" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-sm font-medium text-white/80">Your property journey, supported</p>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">Guidance from people who know the market.</p>
            </div>
          </div>
        </div>
      </section>
      
      <section id="agent-listings" className="bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
       <div className="container mx-auto">
        <div className="mb-8">
          <h2 className="mt-2 text-3xl font-headline font-bold">Our Agents</h2>
          <p className="mt-2 text-muted-foreground">Connect with our expert real estate agents.</p>
        </div>
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {agents.map((agent) => {
              const profileHref = `/@${encodeURIComponent(agent.slug)}`;
              return (
              <Card key={agent.id} className="overflow-hidden card-hover-effect flex flex-col bg-card text-card-foreground">
                <Link href={profileHref}>
                    <CardHeader className="p-0">
                        <SafeImage
                            src={agent.photoUrl ?? ''}
                            alt={`${agent.name}`}
                            width={400}
                            height={300}
                            className="h-48 w-full object-cover"
                            data-ai-hint="person portrait"
                            fallbackSrc="https://placehold.co/400x300.png"
                        />
                    </CardHeader>
                </Link>
                <CardContent className="p-4 flex-grow flex flex-col">
                    <Link href={profileHref}>
                        <CardTitle className="text-xl font-headline hover:underline">{agent.name}</CardTitle>
                    </Link>
                     {agent.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {agent.location}
                      </p>
                    )}
                     {agent.about && (
                        <p className="text-sm text-muted-foreground mt-4 flex-grow">
                           <NeupidMentions text={`${agent.about.substring(0, 100)}${agent.about.length > 100 ? '...' : ''}`} />
                        </p>
                    )}
                </CardContent>
                <CardFooter className="mt-auto bg-muted/40 p-4">
                    <Link href={profileHref} className="w-full">
                        <Button variant="outlined">
                            <MessageSquare className="mr-2 h-4 w-4"/>
                            Contact Agent
                        </Button>
                    </Link>
                </CardFooter>
              </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Agents Found</AlertTitle>
              <AlertDescription>
                  There are currently no agents listed.
              </AlertDescription>
          </Alert>
        )}
       </div>
      </section>
    </main>
  );
}
