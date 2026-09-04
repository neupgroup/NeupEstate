/*
::neup.documentation::post-property-cta

Homepage call-to-action section that encourages owners to list a property.

::end
*/
import { LinkButton } from "#/components/ui/link-button";
import { Home } from "lucide-react";
import { Section } from "@/components/home/_components/section";

export function PostPropertyCTA() {
    return (
        <Section>
            <div className="max-w-2xl text-left">
                  <h2 className="text-3xl font-headline font-bold">Have a property to sell or rent?</h2>
                  <p className="mt-2 text-muted-foreground">
                      Reach thousands of potential buyers and tenants by listing your property with us.
                  </p>
                  <div className="mt-6">
                      <LinkButton href="/sell" basePath={true} size="lg" preIcon={<Home />}>
                          Post Your Property
                      </LinkButton>
                  </div>
              </div>
        </Section>
    )
}
