import { buttonVariants } from "@neup/components/styles/button";
import { Link } from "@neup/components/ui/link";
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

// Use theme-aware borders and text while preserving outlined button interactions.
export function PopularCategories() {
  return (
    <Section>
      <SectionTitle>Popular Categories</SectionTitle>
      <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
        Explore a variety of property types to find the one that best suits your needs, from cozy homes to spacious commercial areas.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {categories.map((category) => (
          <Link
            href={category.href}
            key={category.name}
            className={buttonVariants({
              variant: "outlined",
              className: "h-auto w-full flex-col whitespace-normal rounded-lg border-border p-4 text-center text-foreground [&_svg]:size-6",
            })}
          >
            {category.icon}
            <span className="font-semibold text-sm">{category.name}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
