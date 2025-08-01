
import { ClientLink } from "@/components/client-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "./_components/section";

export function PostPropertyCTA() {
    return (
        <Section className="bg-secondary/50">
            <div className="max-w-2xl text-left">
                  <h2 className="text-3xl font-headline font-bold">Have a property to sell or rent?</h2>
                  <p className="mt-2 text-muted-foreground">
                      Reach thousands of potential buyers and tenants by listing your property with us.
                  </p>
                  <div className="mt-6">
                      <ClientLink href="/sell" className={cn(buttonVariants({ size: 'lg' }))}>
                          Post Your Property
                      </ClientLink>
                  </div>
              </div>
        </Section>
    )
}
