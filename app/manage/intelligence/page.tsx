import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';
import { BarChart2, TrendingUp, ListChecks } from 'lucide-react';

const sections = [
  {
    href: '/manage/intelligence/listings',
    icon: <ListChecks className="h-6 w-6 text-primary" />,
    title: 'Listings Intelligence',
    description: 'Analyse listing performance, trends, and market positioning across your property portfolio.',
  },
  {
    href: '/manage/intelligence/sales',
    icon: <TrendingUp className="h-6 w-6 text-primary" />,
    title: 'Sales Intelligence',
    description: 'Track sales velocity, conversion rates, and revenue insights to drive better outcomes.',
  },
];

export default function IntelligencePage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart2 className="h-6 w-6" />
          Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Data-driven insights across your listings and sales pipeline.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <ClientLink key={s.href} href={s.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                {s.icon}
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{s.description}</CardDescription>
              </CardContent>
            </Card>
          </ClientLink>
        ))}
      </div>
    </div>
  );
}
