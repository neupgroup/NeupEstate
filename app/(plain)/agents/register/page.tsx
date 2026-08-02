/*
::neup.documentation::agent-register-page

Public registration page for enrolling the current account as an agent without redirecting away.

::end
*/

import { UserCheck } from "lucide-react";
import { getAuthenticatedMeData } from "@/services/auth/me";
import { AgentRegisterForm } from "./register-form";
import { ClientLink } from "@/components/client-link";

export default async function AgentRegisterPage() {
  const me = await getAuthenticatedMeData();

  return (
    <main className="flex-1 bg-secondary/35">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UserCheck className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-headline font-bold tracking-tight">Register As An Agent</h1>
              <p className="text-muted-foreground">
                Confirm the required legal agreement before enabling agent access for your account.
              </p>
            </div>
          </div>

          {!me ? (
            <div className="rounded-2xl border border-border bg-background p-5 text-sm text-foreground">
              You must sign in before registering as an agent.
            </div>
          ) : me.guest ? (
            <div className="rounded-2xl border border-border bg-background p-5 text-sm text-foreground">
              Guest accounts cannot register as agents.
            </div>
          ) : me.accountType === "individual.agent" ? (
            <div className="space-y-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-foreground">
              <div className="space-y-1">
                <p className="font-medium">You're already an agent.</p>
                <p className="text-muted-foreground">
                  You can continue your journey on the Neup.Estate platform.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ClientLink
                  href="/manage/properties"
                  className="rounded-xl border border-border bg-background px-4 py-3 font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  Go to your properties
                </ClientLink>

                <ClientLink
                  href="/agencies/register"
                  className="rounded-xl border border-border bg-background px-4 py-3 font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  Register an agency
                </ClientLink>

                <a
                  href="https://neupgroup.com/site/realestate"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border bg-background px-4 py-3 font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  Get a website for yourself
                </a>

                <ClientLink
                  href="/manage/dashboard"
                  className="rounded-xl border border-border bg-background px-4 py-3 font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  Go to your dashboard
                </ClientLink>
              </div>
            </div>
          ) : (
            <AgentRegisterForm />
          )}
        </div>
      </div>
    </main>
  );
}
