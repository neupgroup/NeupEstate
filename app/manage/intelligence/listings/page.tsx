import { getCompetitors } from '@/services/competitor-service';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Globe } from 'lucide-react';

export default async function ListingsIntelligencePage() {
  const competitors = await getCompetitors();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          Listings Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a competitor to analyse their listings via sitemaps and page links.
        </p>
      </div>

      {competitors.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No competitors found. Add them in{' '}
          <ClientLink href="/manage/intelligence/competition" className="text-primary underline">
            Competition
          </ClientLink>
          .
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {competitors.map((competitor) => (
          <ClientLink key={competitor.id} href={`/manage/intelligence/listings/${competitor.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-primary" />
                  {competitor.name}
                </CardTitle>
                {competitor.description && (
                  <CardDescription>{competitor.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{competitor.sources.length} source{competitor.sources.length !== 1 ? 's' : ''}</Badge>
              </CardContent>
            </Card>
          </ClientLink>
        ))}
      </div>
    </div>
  );
}
