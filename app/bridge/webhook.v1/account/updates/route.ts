import { createDecipheriv, createHash, createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { logProblem } from "@/services/problem-service";
import { withRequestDevLog } from "@/services/site-dev-log-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EncryptedEnvelope = {
  eventType?: string;
  encrypted?: boolean;
  iv?: string;
  tag?: string;
  data?: string;
};

type AccountUpdatePayload = {
  success?: boolean;
  eventId: string;
  eventType: "account.updated";
  sourceAppId?: string;
  occurredAt: string;
  appId: string;
  connectionId: string;
  changedFields: string[];
  account: {
    id: string;
    neupId?: string;
    isMinor?: boolean;
    accountType?: string;
    roles?: Array<{
      id?: string;
      name?: string;
      description?: string | null;
      scope?: string | null;
      acquisitionType?: string | null;
      approvalPolicy?: string | null;
      applicableFor?: string[];
      permissions?: string[];
    }>;
  };
  profile?: {
    displayName?: string;
    displayImage?: string;
    gender?: string;
    dateOfBirth?: string;
  };
  role?: {
    id?: string;
    name?: string;
  };
  access?: unknown;
};

type SupportedChangedField =
  | "neupId"
  | "displayName"
  | "displayImage"
  | "gender"
  | "dateOfBirth"
  | "role"
  | "access"
  | "isMinor"
  | "accountType";

type NormalizedAccountRole = {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  acquisitionType: string | null;
  approvalPolicy: string | null;
  applicableFor: string[];
  permissions: string[];
};

function fail(error: string, reason?: string, status = 400) {
  return NextResponse.json(
    reason ? { success: false, error, reason } : { success: false, error },
    { status }
  );
}

function getAppSecret(): string {
  return process.env.BRIDGE_APP_SECRET || process.env.NEUP_APP_SECRET || "";
}

function sha256(input: string): Buffer {
  return createHash("sha256").update(input, "utf8").digest();
}

function verifySignature(
  iv: string,
  tag: string,
  data: string,
  receivedSignature: string,
  appSecret: string
): boolean {
  const signingInput = `${iv}.${tag}.${data}`;
  const expected = createHmac("sha256", appSecret)
    .update(signingInput, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(receivedSignature || "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function decryptEnvelope(ivB64: string, tagB64: string, dataB64: string, appSecret: string): string {
  const key = sha256(appSecret);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

function webhookLog(eventId: string | undefined, message: string, details?: Record<string, unknown>) {
  const prefix = `[bridge/webhook.v1/account/updates][eventId:${eventId ?? "unknown"}]`;
  if (details) {
    console.log(`${prefix} ${message}`, details);
    return;
  }
  console.log(`${prefix} ${message}`);
}

function isValidEnvelope(body: EncryptedEnvelope): body is Required<EncryptedEnvelope> {
  return (
    body.eventType === "account.updated" &&
    body.encrypted === true &&
    typeof body.iv === "string" &&
    typeof body.tag === "string" &&
    typeof body.data === "string"
  );
}

function isValidPayload(input: unknown): input is AccountUpdatePayload {
  const payload = input as AccountUpdatePayload;
  const allowedChangedFields: SupportedChangedField[] = [
    "neupId",
    "displayName",
    "displayImage",
    "gender",
    "dateOfBirth",
    "role",
    "access",
    "isMinor",
    "accountType",
  ];

  return (
    !!payload &&
    payload.success === true &&
    payload.eventType === "account.updated" &&
    typeof payload.eventId === "string" &&
    typeof payload.occurredAt === "string" &&
    typeof payload.appId === "string" &&
    typeof payload.connectionId === "string" &&
    Array.isArray(payload.changedFields) &&
    payload.changedFields.every(
      (field) =>
        typeof field === "string" &&
        allowedChangedFields.includes(field as SupportedChangedField)
    ) &&
    !!payload.account &&
    typeof payload.account.id === "string"
  );
}

function normalizeJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function normalizeRoleState(payload: AccountUpdatePayload): NormalizedAccountRole[] {
  if (Array.isArray(payload.account.roles)) {
    return payload.account.roles
      .map((role) => {
        const roleId = typeof role?.id === "string" ? role.id.trim() : "";
        if (!roleId) return null;

        const applicableFor = Array.isArray(role.applicableFor)
          ? role.applicableFor.filter((value): value is string => typeof value === "string")
          : [];
        const permissions = Array.isArray(role.permissions)
          ? role.permissions.filter((value): value is string => typeof value === "string")
          : [];

        return {
          id: roleId,
          name: typeof role.name === "string" && role.name.trim().length > 0 ? role.name.trim() : roleId,
          description: typeof role.description === "string" ? role.description : null,
          scope: typeof role.scope === "string" ? role.scope : null,
          acquisitionType: typeof role.acquisitionType === "string" ? role.acquisitionType : null,
          approvalPolicy: typeof role.approvalPolicy === "string" ? role.approvalPolicy : null,
          applicableFor,
          permissions,
        };
      })
      .filter((role): role is NormalizedAccountRole => Boolean(role));
  }

  if (payload.role && typeof payload.role.id === "string" && payload.role.id.trim().length > 0) {
    const roleId = payload.role.id.trim();
    return [
      {
        id: roleId,
        name:
          typeof payload.role.name === "string" && payload.role.name.trim().length > 0
            ? payload.role.name.trim()
            : roleId,
        description: null,
        scope: null,
        acquisitionType: null,
        approvalPolicy: null,
        applicableFor: [] as string[],
        permissions: [] as string[],
      },
    ];
  }

  return [];
}

async function persistAccountUpdate(
  tx: Prisma.TransactionClient,
  payload: AccountUpdatePayload,
) {
  webhookLog(payload.eventId, "Has asked to update account/user.");
  const accountId = payload.account.id.trim();
  if (!accountId) throw new Error("Missing account.id.");

  const connectionId = payload.connectionId.trim();
  if (!connectionId) throw new Error("Missing connectionId.");
  webhookLog(payload.eventId, "Looking for user.", { accountId, connectionId });

  const changedFields = new Set(payload.changedFields);
  const hasChangedField = (field: SupportedChangedField): boolean => changedFields.has(field);
  const rolesWereProvided = Array.isArray(payload.account.roles) || Boolean(payload.role);
  const normalizedRoles = normalizeRoleState(payload);
  const primaryRoleId = normalizedRoles[0]?.id ?? null;

  if (rolesWereProvided) {
    webhookLog(payload.eventId, "Replacing account role state from payload.", {
      appId: payload.appId,
      accountId,
      roleCount: normalizedRoles.length,
    });

    for (const role of normalizedRoles) {
      await tx.authzRole.upsert({
        where: { id: role.id },
        update: {
          name: role.name,
          appId: payload.appId,
          description: role.description,
          scope: role.scope,
          acquisitionType: role.acquisitionType,
          approvalPolicy: role.approvalPolicy,
          applicableFor: normalizeJsonValue(role.applicableFor) ?? Prisma.JsonNull,
          permissions: normalizeJsonValue(role.permissions) ?? Prisma.JsonNull,
        },
        create: {
          id: role.id,
          name: role.name,
          appId: payload.appId,
          description: role.description,
          scope: role.scope,
          acquisitionType: role.acquisitionType,
          approvalPolicy: role.approvalPolicy,
          applicableFor: normalizeJsonValue(role.applicableFor) ?? Prisma.JsonNull,
          permissions: normalizeJsonValue(role.permissions) ?? Prisma.JsonNull,
        },
      });
    }
  }

  const updateData = {
    ...(hasChangedField("neupId") && typeof payload.account.neupId === "string"
      ? { neupId: payload.account.neupId.trim() }
      : {}),
    ...(hasChangedField("displayName") && typeof payload.profile?.displayName === "string"
      ? { displayName: payload.profile.displayName }
      : {}),
    ...(hasChangedField("displayImage") && typeof payload.profile?.displayImage === "string"
      ? { displayImage: payload.profile.displayImage }
      : {}),
    ...(hasChangedField("accountType") && typeof payload.account.accountType === "string"
      ? { accountType: payload.account.accountType }
      : {}),
    connectionId,
    ...(rolesWereProvided ? { roleId: primaryRoleId } : {}),
    accessedOn: new Date(),
  };

  webhookLog(payload.eventId, "Upserting account with changed fields.");
  await tx.account.upsert({
    where: { id: accountId },
    update: updateData,
    create: {
      id: accountId,
      neupId:
        hasChangedField("neupId") && typeof payload.account.neupId === "string"
          ? payload.account.neupId.trim()
          : null,
      accountType:
        hasChangedField("accountType") && typeof payload.account.accountType === "string"
          ? payload.account.accountType
          : "individual",
      displayName:
        hasChangedField("displayName") && typeof payload.profile?.displayName === "string"
          ? payload.profile.displayName
          : null,
      displayImage:
        hasChangedField("displayImage") && typeof payload.profile?.displayImage === "string"
          ? payload.profile.displayImage
          : null,
      connectionId,
      roleId: rolesWereProvided ? primaryRoleId : null,
      createdOn: new Date(),
      accessedOn: new Date(),
    },
  });

  if (rolesWereProvided) {
    await tx.accountAccess.deleteMany({
      where: {
        accountId,
        appId: payload.appId,
      },
    });

    if (normalizedRoles.length > 0) {
      await tx.accountAccess.createMany({
        data: normalizedRoles.map((role) => ({
          accountId,
          appId: payload.appId,
          roleId: role.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (
    hasChangedField("neupId") &&
    typeof payload.account.neupId === "string" &&
    payload.account.neupId.trim().length > 0
  ) {
    webhookLog(payload.eventId, "Syncing secondary rows by neupId.");
    const secondaryAccountIds = (
      await tx.account.findMany({
        where: {
          neupId: payload.account.neupId.trim(),
          NOT: { id: accountId },
        },
        select: { id: true },
      })
    ).map((account) => account.id);

    await tx.account.updateMany({
      where: {
        neupId: payload.account.neupId.trim(),
        NOT: { id: accountId },
      },
      data: updateData,
    });

    if (rolesWereProvided && secondaryAccountIds.length > 0) {
      await tx.accountAccess.deleteMany({
        where: {
          accountId: { in: secondaryAccountIds },
          appId: payload.appId,
        },
      });

      if (normalizedRoles.length > 0) {
        await tx.accountAccess.createMany({
          data: secondaryAccountIds.flatMap((secondaryAccountId) =>
            normalizedRoles.map((role) => ({
              accountId: secondaryAccountId,
              appId: payload.appId,
              roleId: role.id,
            }))
          ),
          skipDuplicates: true,
        });
      }
    }
  }
  webhookLog(payload.eventId, "Finished persistence for this payload.");
}

const postHandler = async (req: NextRequest) => {
  webhookLog(undefined, "Received webhook request.");
  const appSecret = getAppSecret();
  if (!appSecret) {
    webhookLog(undefined, "Misconfigured secret.");
    return fail("misconfigured_secret", "Set BRIDGE_APP_SECRET or NEUP_APP_SECRET.", 500);
  }

  const encHeader = req.headers.get("x-bridge-encryption") || "";
  const sigAlgHeader = req.headers.get("x-bridge-signature-alg") || "";
  const signature = req.headers.get("x-bridge-signature") || "";

  if (encHeader.toLowerCase() !== "aes-256-gcm" || sigAlgHeader.toLowerCase() !== "hmac-sha256") {
    webhookLog(undefined, "Invalid encryption/signature headers.");
    return fail("invalid_headers", "Unsupported bridge encryption/signature headers.");
  }

  let body: EncryptedEnvelope;
  try {
    body = (await req.json()) as EncryptedEnvelope;
  } catch {
    webhookLog(undefined, "Invalid JSON body.");
    return fail("invalid_body", "Body must be valid JSON.");
  }

  if (!isValidEnvelope(body)) {
    webhookLog(undefined, "Missing required encrypted envelope fields.");
    return fail("invalid_body", "Missing required encrypted envelope fields.");
  }

  if (!verifySignature(body.iv, body.tag, body.data, signature, appSecret)) {
    webhookLog(undefined, "Invalid signature.");
    return fail("invalid_signature");
  }
  webhookLog(undefined, "Signature verified.");

  let decryptedText = "";
  try {
    decryptedText = decryptEnvelope(body.iv, body.tag, body.data, appSecret);
  } catch (error) {
    await logProblem(error, "bridge/webhook.v1/account/updates decrypt");
    webhookLog(undefined, "Failed to decrypt payload.");
    return fail("decrypt_failed");
  }
  webhookLog(undefined, "Payload decrypted.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(decryptedText);
  } catch {
    webhookLog(undefined, "Decrypted payload is not valid JSON.");
    return fail("decrypt_failed", "Decrypted payload is not valid JSON.");
  }

  const payloads = Array.isArray(parsed) ? parsed : [parsed];
  if (!payloads.length || !payloads.every(isValidPayload)) {
    webhookLog(undefined, "Invalid payload shape.");
    return fail("invalid_payload", "Decrypted payload shape is invalid.");
  }
  webhookLog((payloads[0] as AccountUpdatePayload).eventId, "Payload validated.", {
    payloadCount: payloads.length,
  });

  const mergedChangedFields = new Set<string>();
  try {
    await prisma.$transaction(async (tx) => {
      for (const payload of payloads) {
        webhookLog(payload.eventId, "Processing payload.");
        await persistAccountUpdate(tx, payload);
        for (const field of payload.changedFields) mergedChangedFields.add(field);
      }
    });
  } catch (error) {
    await logProblem(error, "bridge/webhook.v1/account/updates persist");
    if (error instanceof Error && error.message.startsWith("Role does not exist in authz_role:")) {
      webhookLog(undefined, "Role does not exist. Sending failure response.", { reason: error.message });
      return NextResponse.json(
        {
          success: false,
          error: "role_not_exists",
          reason: error.message,
        },
        { status: 400 }
      );
    }
    webhookLog(undefined, "Persistence failed. Sending failure response.");
    return fail("record_failed");
  }

  webhookLog((payloads[0] as AccountUpdatePayload).eventId, "Response sent.", {
    changedFields: Array.from(mergedChangedFields),
  });
  return NextResponse.json({
    success: true,
    changedFields: Array.from(mergedChangedFields),
  });
};

const getHandler = async (req: NextRequest) => {
  return NextResponse.json(
    {
      success: false,
      error: "invalid_request_method",
    },
    { status: 400 }
  );
};

export const POST = withRequestDevLog({ source: 'webhook', name: 'bridge/webhook.v1/account/updates:POST' }, postHandler);
export const GET = withRequestDevLog({ source: 'webhook', name: 'bridge/webhook.v1/account/updates:GET' }, getHandler);
