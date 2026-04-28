import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const competitorSnapshots = [
  {
    name: "Northside Realty",
    focus: "Luxury condos",
    pricing: "8% above market",
    velocity: "22 days avg",
  },
  {
    name: "UrbanKey Partners",
    focus: "Investment homes",
    pricing: "4% below market",
    velocity: "29 days avg",
  },
  {
    name: "Sunrise Estates",
    focus: "Suburban family",
    pricing: "At market",
    velocity: "18 days avg",
  },
];

const marketPulse = [
  { label: "Active listings", value: "1,284" },
  { label: "New listings (30d)", value: "312" },
  { label: "Avg. price / sqft", value: "$412" },
  { label: "Median DOM", value: "24 days" },
];

const tools = [
  {
    title: "Price tracker",
    description: "Monitor competitor pricing changes across key neighborhoods.",
  },
  {
    title: "Listing share",
    description: "Track market share by property type and budget range.",
  },
  {
    title: "Review sentiment",
    description: "Surface trends in competitor reviews and client feedback.",
  },
  {
    title: "Campaign watch",
    description: "Follow paid and organic campaigns across channels.",
  },
];

export default function CompetitionPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Competition & market</h1>
        <p className="text-sm text-muted-foreground">
          Tools and signals to stay ahead of competitors and spot market shifts.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Competitor snapshots</h2>
          <p className="text-sm text-muted-foreground">
            A quick view of pricing posture, focus areas, and velocity.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitorSnapshots.map((competitor) => (
            <Card key={competitor.name}>
              <CardHeader>
                <CardTitle className="text-base">{competitor.name}</CardTitle>
                <CardDescription>{competitor.focus}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pricing posture</span>
                  <span className="font-medium">{competitor.pricing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Listing velocity</span>
                  <span className="font-medium">{competitor.velocity}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Market pulse</h2>
          <p className="text-sm text-muted-foreground">
            Weekly indicators from your core markets.
          </p>
        </div>
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {marketPulse.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Tools</h2>
          <p className="text-sm text-muted-foreground">
            Run deeper analysis or export reports for your team.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool.title}>
              <CardHeader>
                <CardTitle className="text-base">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="inline-flex items-center text-sm font-medium text-primary">
                  Configure tool
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
