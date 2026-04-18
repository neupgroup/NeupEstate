import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/home/_components/section";
import { SectionTitle } from "@/components/home/_components/section-title";

export function OurServices() {
    return (
        <Section>
             <SectionTitle>Our Services</SectionTitle>
             <p className="text-muted-foreground mb-6 max-w-2xl">
                We offer a range of services to help you at every step of your real estate journey.
            </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="card-hover-effect"><CardContent className="p-6"><h3 className="font-semibold">Property Valuation</h3><p className="text-sm text-muted-foreground mt-1">Get an accurate valuation of your property from our certified experts.</p></CardContent></Card>
                 <Card className="card-hover-effect"><CardContent className="p-6"><h3 className="font-semibold">Legal Assistance</h3><p className="text-sm text-muted-foreground mt-1">Navigate the legal complexities of real estate with our trusted legal partners.</p></CardContent></Card>
                 <Card className="card-hover-effect"><CardContent className="p-6"><h3 className="font-semibold">Mortgage Support</h3><p className="text-sm text-muted-foreground mt-1">We help you secure the best mortgage rates through our network of banks.</p></CardContent></Card>
             </div>
        </Section>
    )
}
