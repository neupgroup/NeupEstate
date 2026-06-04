import { ClientLink } from "@/components/estate";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/logica/core/utils";
import { FileSearch } from "lucide-react";
import { Section } from "@/components/home/_components/section";

export function PropertyRequirementsCTA() {
    return (
         <Section>
          <div className="max-w-2xl text-left">
              <h2 className="text-3xl font-headline font-bold">Can't find what you're looking for?</h2>
              <p className="mt-2 text-muted-foreground">
                  Let us know your requirements, and our expert agents will find the perfect property for you.
              </p>
              <div className="mt-6">
                  <ClientLink href="/requests/create" className={cn(buttonVariants({ size: 'lg' }))}>
                      <FileSearch className="mr-2 h-5 w-5" />
                      Post Your Requirements
                  </ClientLink>
              </div>
          </div>
      </Section>
    )
}
