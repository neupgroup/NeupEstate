import { RecommendedProperties } from "@/components/recommended-properties";
import { Wand2 } from "lucide-react";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export function PropertyCollections() {
    return (
        <Section>
            <SectionTitle href="/collections">
                For You: AI Recommendations
            </SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                Based on your interests, our AI has curated a list of properties you might love.
            </p>
            <RecommendedProperties />
        </Section>
    );
}
