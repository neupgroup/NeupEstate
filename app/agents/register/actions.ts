"use server";

/*
::neup.documentation::agent-register-action

Validates the public agent registration agreement and triggers enrollment.

::end
*/

import { getAuthenticatedMeData } from "@/services/auth/me";
import { enrollCurrentAccountAsAgent } from "@/services/agent-registration-service";

export type AgentRegisterActionState = {
  error: string | null;
  success: boolean;
};

export async function registerAsAgentAction(
  _prevState: AgentRegisterActionState,
  formData: FormData,
): Promise<AgentRegisterActionState> {
  const me = await getAuthenticatedMeData();

  if (!me) {
    return { success: false, error: "You must sign in before registering as an agent." };
  }

  if (me.guest) {
    return { success: false, error: "Guest accounts cannot register as agents." };
  }

  if (me.accountType === "individual.agent") {
    return { success: true, error: null };
  }

  const agreed = formData.get("agreeToAgentTerms") === "true";

  if (!agreed) {
    return { success: false, error: "You must agree to the agent terms before continuing." };
  }

  const result = await enrollCurrentAccountAsAgent();

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, error: null };
}
