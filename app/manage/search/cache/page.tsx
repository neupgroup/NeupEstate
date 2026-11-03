import { prisma } from '@neup/core/database/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

// Render saved natural-language searches and their parsed AI values for managers.
export default async function NaturalSearchCachePage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const searches = await prisma.naturalSearch.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Natural search cache</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search terms and the structured values returned by AI.
        </p>
      </header>

      {searches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No natural-language searches have been cached yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {searches.map((search) => (
            <Card key={search.id}>
              <CardHeader>
                <CardTitle className="text-base">{search.title}</CardTitle>
                <CardDescription>{search.createdAt.toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
                  {JSON.stringify(search.value, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
