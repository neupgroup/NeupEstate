
import { Link } from "@neup/components/ui/link";
import { getPublicAgencyAccounts } from "@/services/agencies/agency/service";
import { Card, CardContent, CardHeader, CardTitle } from "@neup/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@neup/components/ui/alert";
import { SafeImage } from "@/components/estate";
import { AlertCircle, ArrowDown, Network } from "lucide-react";

export default async function AgenciesPage() {
  const agencies = await getPublicAgencyAccounts({ limit: 100 });

  return (
    <main className="flex-1">
      <section className="bg-background">
        <div className="container mx-auto grid gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Network className="h-4 w-4" /> Trusted teams across the property market
            </p>
            <h1 className="text-4xl font-headline font-bold tracking-tight sm:text-5xl lg:text-6xl">Discover real estate agencies ready to help.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Explore agencies and branches on Neup.Estate, see the professionals behind them, and find a team that fits your property plans.</p>
            <a href="#agency-listings" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Explore agencies <ArrowDown className="h-4 w-4" />
            </a>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-lg sm:min-h-[410px]">
            <SafeImage src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85" alt="Modern office buildings representing real estate agencies" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" fallbackSrc="https://placehold.co/1200x900.png" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-sm font-medium text-white/80">Local teams. Shared expertise.</p>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">Meet the agencies connecting people with property.</p>
            </div>
          </div>
        </div>
      </section>
      
      <section id="agency-listings" className="bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
       <div className="container mx-auto">
        <div className="mb-8">
          <h2 className="mt-2 text-3xl font-headline font-bold">Our Partner Agencies</h2>
          <p className="mt-2 text-muted-foreground">Meet the brand and branch accounts active on Neup.Estate.</p>
        </div>
        {agencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agencies.map((agency) => {
              const neupId = agency.neupId?.trim();
              const profileHref = neupId ? `/@${neupId}` : null;
              const agentsHref = neupId ? `/@${neupId}/agents` : null;
              const propertiesHref = neupId ? `/@${neupId}/properties` : null;
              return (
                <Card key={agency.id} className="flex flex-col overflow-hidden bg-card text-card-foreground transition-shadow duration-300 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center gap-4 bg-muted/40 p-6">
                    <SafeImage
                      src={agency.logoUrl}
                      alt={`${agency.name} logo`}
                      width={64}
                      height={64}
                      className="h-16 w-16 object-contain rounded-md border p-1 bg-white"
                      data-ai-hint="company logo"
                      fallbackSrc="https://placehold.co/64x64.png"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-xl font-headline">
                        {profileHref ? (
                          <Link href={profileHref} className="hover:underline">
                            {agency.name}
                          </Link>
                        ) : (
                          agency.name
                        )}
                      </CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {agentsHref ? (
                          <Link
                            href={agentsHref}
                            className="hover:text-foreground hover:underline"
                          >
                            {agency.agentCount} Agents
                          </Link>
                        ) : (
                          <span>{agency.agentCount} Agents</span>
                        )}
                        {", "}
                        {propertiesHref ? (
                          <Link
                            href={propertiesHref}
                            className="hover:text-foreground hover:underline"
                          >
                            {agency.propertyCount} properties
                          </Link>
                        ) : (
                          <span>{agency.propertyCount} properties</span>
                        )}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow p-6 pt-0" />
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Agencies Found</AlertTitle>
              <AlertDescription>
                  There are currently no agencies listed.
              </AlertDescription>
          </Alert>
        )}
       </div>
      </section>
    </main>
  );
}
