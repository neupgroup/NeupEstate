import { TrendingUp } from 'lucide-react';

export default function SalesIntelligencePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Sales Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track sales velocity, conversion rates, and revenue insights to drive better outcomes.
        </p>
      </div>

      <div className="text-muted-foreground text-sm">
        Coming soon.
      </div>
    </div>
  );
}
