import { ListChecks } from 'lucide-react';

export default function ListingsIntelligencePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          Listings Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Analyse listing performance, trends, and market positioning across your property portfolio.
        </p>
      </div>

      <div className="text-muted-foreground text-sm">
        Coming soon.
      </div>
    </div>
  );
}
