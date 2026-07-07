"use client";

/*
::neup.documentation::agent-register-form

Client form for confirming agent terms before submitting the enrollment action.

::end
*/

import { useActionState, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { registerAsAgentAction, type AgentRegisterActionState } from "./actions";

const initialState: AgentRegisterActionState = {
  error: null,
  success: false,
};

export function AgentRegisterForm() {
  const [agreed, setAgreed] = useState(false);
  const [state, formAction, isPending] = useActionState(registerAsAgentAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="agreeToAgentTerms" value={agreed ? "true" : "false"} />

      <div className="rounded-2xl border border-border bg-background/90 p-5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="agree-to-agent-terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(Boolean(checked))}
            className="mt-1"
          />
          <div className="space-y-2">
            <Label htmlFor="agree-to-agent-terms" className="text-base font-medium leading-6">
              I agree with the additional terms of conditions required to be an agent.
            </Label>
            <p className="text-sm text-muted-foreground">
              Read all the terms and conditions and privacy policy for the agent at:
            </p>
            <a
              href="https://neupgroup.com/legal/terms/estate/agents"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              https://neupgroup.com/legal/terms/estate/agents
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/35 p-5">
        <p className="text-base font-medium">Are you sure you want to be an agent.</p>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to continue</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertTitle>Agent registration complete</AlertTitle>
          <AlertDescription>Your account is now registered as an agent.</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!agreed || isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Continue
      </Button>
    </form>
  );
}
