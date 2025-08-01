
import { getAgencies } from "@/services/agency-service";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafeImage } from "@/components/safe-image";
import { Building, AlertCircle, Globe, Mail, Phone, User, MapPin, Milestone } from "lucide-react";

export default async function AgenciesPage() {
  const agencies = await getAgencies({ limit: 100 });

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            Our Partner Agencies
          </h1>
          <p className="mt-2 text-muted-foreground">
            Meet the professional teams we work with.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {agencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agencies.map((agency) => (
              <Card key={agency.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
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
                    <CardTitle className="text-xl font-headline">{agency.name}</CardTitle>
                    {agency.website && (
                      <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 break-all">
                        <Globe className="h-3 w-3" />
                        {agency.website.replace(/^(https?:\/\/)/, '')}
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 flex-grow">
                  {agency.contactPersonName && (
                    <div className="flex items-start gap-3">
                        <User className="h-5 w-5 mt-1 text-primary" />
                        <div>
                            <h4 className="font-semibold text-sm">Contact Person</h4>
                            <p className="text-muted-foreground text-sm">{agency.contactPersonName} {agency.contactPersonRole && `(${agency.contactPersonRole})`}</p>
                        </div>
                    </div>
                  )}

                  {(agency.contactEmail || agency.contactPhone) && (
                     <div className="space-y-2">
                        {agency.contactEmail && (
                            <div className="flex items-start gap-3">
                                <Mail className="h-5 w-5 mt-1 text-primary" />
                                <div>
                                    <h4 className="font-semibold text-sm">Email</h4>
                                    <a href={`mailto:${agency.contactEmail}`} className="text-muted-foreground text-sm hover:underline break-all">{agency.contactEmail}</a>
                                </div>
                            </div>
                        )}
                        {agency.contactPhone && (
                             <div className="flex items-start gap-3">
                                <Phone className="h-5 w-5 mt-1 text-primary" />
                                <div>
                                    <h4 className="font-semibold text-sm">Phone</h4>
                                    <p className="text-muted-foreground text-sm">{agency.contactPhone}</p>
                                </div>
                            </div>
                        )}
                     </div>
                  )}

                  {agency.mainLocation && (
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 mt-1 text-primary" />
                        <div>
                            <h4 className="font-semibold text-sm">Main Office</h4>
                            <p className="text-muted-foreground text-sm">{agency.mainLocation}</p>
                        </div>
                    </div>
                  )}

                  {agency.branches && agency.branches.length > 0 && (
                    <div className="flex items-start gap-3">
                        <Milestone className="h-5 w-5 mt-1 text-primary" />
                        <div>
                            <h4 className="font-semibold text-sm">Branches</h4>
                            <ul className="list-disc list-inside text-muted-foreground text-sm">
                                {agency.branches.map(branch => <li key={branch}>{branch}</li>)}
                            </ul>
                        </div>
                    </div>
                  )}

                </CardContent>
                {agency.registeredName && (
                  <CardFooter className="p-4 bg-secondary/50">
                      <p className="text-xs text-muted-foreground">Registered Name: {agency.registeredName}</p>
                  </CardFooter>
                )}
              </Card>
            ))}
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
