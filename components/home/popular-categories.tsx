import { Card } from "@/components/ui/card";
import { ClientLink } from "@/components/client-link";
import { Home, Building, Briefcase, Sofa, LandPlot } from "lucide-react";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

const categories = [
    { name: "Houses", icon: <Home />, href: "/search/House" },
    { name: "Flats", icon: <Building />, href: "/search/Flat" },
    { name: "Office Space", icon: <Briefcase />, href: "/search/Office" },
    { name: "Apartments", icon: <Building />, href: "/search/Apartment" },
    { name: "Rooms", icon: <Sofa />, href: "/search/Room" },
    { name: "Shop Space", icon: <Home />, href: "/search/Shop" },
    { name: "Lands", icon: <LandPlot />, href: "/search/Land" },
];

export function PopularCategories() {
  return (
    <Section>
      <SectionTitle>Popular Categories</SectionTitle>
      <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
        Explore a variety of property types to find the one that best suits your needs, from cozy homes to spacious commercial areas.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {categories.map((category) => (
          <ClientLink href={category.href} key={category.name}>
            <Card className="text-center p-4 card-hover-effect">
              <div className="flex justify-center text-primary mb-2">{category.icon}</div>
              <p className="font-semibold text-sm">{category.name}</p>
            </Card>
          </ClientLink>
        ))}
      </div>
    </Section>
  );
}
