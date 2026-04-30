import { getFeaturedAgencies } from "@/services/agency-service";
import { Card } from "@/components/ui/card";
import { SafeImage } from "@/components/safe-image";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";
import { ClientLink } from "@/components/client-link";

export async function FeaturedAgencies() {
    const agencies = await getFeaturedAgencies(4);
    if(agencies.length === 0) return null;

    return (
        <Section>
            <SectionTitle href="/agencies" showMoreButton={true}>Featured Agencies</SectionTitle>
            <p className="mt-2 text-muted-foreground mb-6 max-w-2xl">
                We partner with the best in the business to bring you top-quality listings and services.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {agencies.map(agency => (
                    <ClientLink href={`/agencies`} key={agency.id}>
                        <Card className="p-4 flex flex-col items-center justify-center text-center card-hover-effect h-full">
                            <SafeImage src={agency.logoUrl} alt={agency.name} width={120} height={40} className="h-10 object-contain mb-4" data-ai-hint="company logo" fallbackSrc="https://placehold.co/120x40.png" />
                            <h3 className="font-semibold flex-grow flex items-center">{agency.name}</h3>
                        </Card>
                    </ClientLink>
                ))}
            </div>
        </Section>
    );
}
