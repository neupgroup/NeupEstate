import { ClientLink } from "@/components/client-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Section } from "@/components/home/_components/section";
import { UserCheck, Building2 } from "lucide-react";

export function StartWithNeupEstate({ showCards = true }: { showCards?: boolean }) {
    return (
        <Section className="bg-primary/5 border-t border-border">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-headline font-bold">Start with NeupEstate</h2>
                <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
                    Join our growing network of real estate professionals and take your business to the next level.
                </p>
            </div>

            {showCards && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                {/* Become an Agent */}
                <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-background p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <UserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold font-headline">Become an Agent</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Register as a real estate agent and connect with buyers, sellers, and renters across Nepal.
                        </p>
                    </div>
                    <ClientLink
                        href="/agents/register"
                        className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-auto")}
                    >
                        Get Started
                    </ClientLink>
                </div>

                {/* Create an Agency Profile */}
                <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-background p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold font-headline">Create an Agency Profile</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Establish your agency's presence on NeupEstate and manage your team and listings in one place.
                        </p>
                    </div>
                    <ClientLink
                        href="/agencies/register"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-auto")}
                    >
                        Create Profile
                    </ClientLink>
                </div>
                </div>
            )}
        </Section>
    );
}
