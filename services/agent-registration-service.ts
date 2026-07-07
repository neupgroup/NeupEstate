/*
::neup.documentation::agent-registration-service

Handles the public agent enrollment flow against the Neup.Account bridge and
promotes the local account row to an agent account on success.

::end
*/

import { headers } from "next/headers";
import { prisma } from "@/logica/core/prisma";
import { getAccountId } from "@/services/auth";
import { promoteStoredAccountType } from "@/services/account-type";
import { logApiExchange } from "@/services/api-log-service";

const ENROLL_AGENT_ROLE_URL = "https://neupgroup.com/account/bridge/api.v1/roles/enroll";
const AGENT_ROLE_ID = "NeupEstate.660724c77.individual-beagent";

type AgentEnrollmentResult =
  | { success: true }
  | { success: false; error: string };

function safeJsonParse(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function headersToObject(headerBag: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headerBag.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.error ?? record.message ?? record.reason;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return fallback;
}

export async function enrollCurrentAccountAsAgent(): Promise<AgentEnrollmentResult> {
  const accountId = await getAccountId();
  const appId = process.env.NEUP_APP_ID ?? "";
  const appSecret = process.env.NEUP_APP_SECRET ?? "";

  if (!accountId) {
    return { success: false, error: "You must be signed in to continue." };
  }

  if (!appId || !appSecret) {
    return { success: false, error: "Agent enrollment is not configured for this application." };
  }

  const incomingHeaders = await headers();
  const inboundOrigin = incomingHeaders.get("origin") ?? "";
  const inboundCookie = incomingHeaders.get("cookie") ?? "";

  const requestBody = {
    appId,
    appSecret,
    roleId: AGENT_ROLE_ID,
    accountId,
  };

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(inboundOrigin ? { Origin: inboundOrigin } : {}),
    ...(inboundCookie ? { Cookie: inboundCookie } : {}),
  };

  let response: Response;
  try {
    response = await fetch(ENROLL_AGENT_ROLE_URL, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
  } catch (error: any) {
    await logApiExchange({
      context: "agent-registration:enroll",
      request: {
        method: "POST",
        url: ENROLL_AGENT_ROLE_URL,
        headers: { "Content-Type": "application/json", ...(inboundOrigin ? { Origin: inboundOrigin } : {}) },
        body: { appId, appSecret: "***REDACTED***", roleId: AGENT_ROLE_ID, accountId },
      },
      error: error?.message ?? "network_error",
    });
    return { success: false, error: error?.message ?? "Unable to contact the enrollment service." };
  }

  const responseText = await response.text();
  const responseBody = safeJsonParse(responseText);

  await logApiExchange({
    context: "agent-registration:enroll",
    request: {
      method: "POST",
      url: ENROLL_AGENT_ROLE_URL,
      headers: { "Content-Type": "application/json", ...(inboundOrigin ? { Origin: inboundOrigin } : {}) },
      body: { appId, appSecret: "***REDACTED***", roleId: AGENT_ROLE_ID, accountId },
    },
    response: {
      status: response.status,
      headers: headersToObject(response.headers),
      body: responseBody,
    },
  });

  if (!response.ok) {
    return {
      success: false,
      error: extractErrorMessage(responseBody, "Agent enrollment failed."),
    };
  }

  if (responseBody && typeof responseBody === "object") {
    const record = responseBody as Record<string, unknown>;
    if (record.success === false) {
      return {
        success: false,
        error: extractErrorMessage(responseBody, "Agent enrollment was rejected."),
      };
    }
  }

  const existingAccount = await prisma.account.findUnique({
    where: { id: accountId },
    select: { accountType: true },
  });

  await prisma.account.update({
    where: { id: accountId },
    data: {
      accountType: promoteStoredAccountType(existingAccount?.accountType, "agent"),
    },
  });

  return { success: true };
}
