
import Link from "next/link";
import { getPublicAgencyAccounts } from "@/services/agency-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafeImage } from "@/components/estate";
import { Building, AlertCircle } from "lucide-react";

export default async function AgenciesPage() {
  const agencies = await getPublicAgencyAccounts({ limit: 100 });

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            Our Partner Agencies
          </h1>
          <p className="mt-2 text-muted-foreground">
            Meet the brand and branch accounts active on Neup.Estate.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {agencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agencies.map((agency) => {
              const neupId = agency.neupId?.trim();
              const profileHref = neupId ? `/@${neupId}` : null;
              const agentsHref = neupId ? `/@${neupId}/agents` : null;
              const propertiesHref = neupId ? `/@${neupId}/properties` : null;
              return (
                <Card key={agency.id} className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center gap-4 p-6 bg-secondary/50">
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
    </main>
  );
}
