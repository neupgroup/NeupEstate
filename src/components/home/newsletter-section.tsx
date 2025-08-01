import { NewsletterSubscriptionForm } from "@/components/newsletter-subscription-form";
import { Section } from "./_components/section";

export function NewsletterSection() {
    return (
         <Section>
          <div className="max-w-2xl text-left">
              <h2 className="text-3xl font-headline font-bold">Stay Updated</h2>
              <p className="mt-2 text-muted-foreground">
                  Subscribe to our newsletter to get the latest properties and market news delivered to your inbox.
              </p>
              <div className="mt-6">
                 <NewsletterSubscriptionForm />
              </div>
          </div>
      </Section>
    )
}
