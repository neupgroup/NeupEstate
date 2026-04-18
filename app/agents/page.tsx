
import { getAgents } from "@/services/agent-service";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafeImage } from "@/components/safe-image";
import { User, MapPin, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientLink } from "@/components/client-link";

export default async function AgentsPage() {
  const agents = await getAgents({ limit: 100 });

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            Our Agents
          </h1>
          <p className="mt-2 text-muted-foreground">
            Connect with our expert real estate agents.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {agents.map((agent) => (
              <Card key={agent.id} className="overflow-hidden card-hover-effect flex flex-col">
                <ClientLink href={`/agents/${agent.slug}`}>
                    <CardHeader className="p-0">
                        <SafeImage
                            src={agent.photoUrl}
                            alt={`${agent.name}`}
                            width={400}
                            height={300}
                            className="h-48 w-full object-cover"
                            data-ai-hint="person portrait"
                            fallbackSrc="https://placehold.co/400x300.png"
                        />
                    </CardHeader>
                </ClientLink>
                <CardContent className="p-4 flex-grow flex flex-col">
                    <ClientLink href={`/agents/${agent.slug}`}>
                        <CardTitle className="text-xl font-headline hover:underline">{agent.name}</CardTitle>
                    </ClientLink>
                     {agent.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {agent.location}
                      </p>
                    )}
                     {agent.about && (
                        <p className="text-sm text-muted-foreground mt-4 flex-grow">
                           {agent.about.substring(0, 100)}{agent.about.length > 100 && '...'}
                        </p>
                    )}
                </CardContent>
                <CardFooter className="p-4 mt-auto bg-secondary/30">
                    <ClientLink href={`/agents/${agent.slug}/contact`} className="w-full">
                        <Button className="w-full" variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4"/>
                            Contact Agent
                        </Button>
                    </ClientLink>
                </CardFooter>
              </Card>
            ))}
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
    </main>
  );
}
