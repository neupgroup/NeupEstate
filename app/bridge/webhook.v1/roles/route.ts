import { createDecipheriv, createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/logica/core/prisma";
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

type RoleEventType = "role.updated" | "role.deleted";
type RoleAction = "created_role" | "updated_role" | "deleted_role";

type RolePayload = {
  success?: boolean;
  eventId: string;
  eventType: RoleEventType;
  sourceAppId?: string;
  occurredAt?: string;
  appId: string;
  role?: {
    id: string;
    name: string;
    description?: string | null;
    scope?: string | null;
    acquisitionType?: string | null;
    approvalPolicy?: string | null;
    applicableFor?: string[];
    permissions?: string[];
  };
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

function isValidEnvelope(body: EncryptedEnvelope): body is Required<EncryptedEnvelope> {
  return (
    typeof body.eventType === "string" &&
    body.encrypted === true &&
    typeof body.iv === "string" &&
    typeof body.tag === "string" &&
    typeof body.data === "string"
  );
}

function isRoleEventType(eventType: unknown): eventType is RoleEventType {
  return eventType === "role.updated" || eventType === "role.deleted";
}

function isValidRolePayload(input: unknown): input is RolePayload {
  const payload = input as RolePayload;
  const role = payload?.role;
  if (
    !payload ||
    payload.success !== true ||
    typeof payload.eventId !== "string" ||
    !isRoleEventType(payload.eventType) ||
    typeof payload.appId !== "string" ||
    !role ||
    typeof role.id !== "string" ||
    typeof role.name !== "string"
  ) {
    return false;
  }

  if (payload.eventType === "role.updated") {
    return (
      (role.description === undefined || role.description === null || typeof role.description === "string") &&
      (role.scope === undefined || role.scope === null || typeof role.scope === "string") &&
      (role.acquisitionType === undefined || role.acquisitionType === null || typeof role.acquisitionType === "string") &&
      (role.approvalPolicy === undefined || role.approvalPolicy === null || typeof role.approvalPolicy === "string") &&
      (role.applicableFor === undefined ||
        (Array.isArray(role.applicableFor) &&
          role.applicableFor.every((value) => typeof value === "string"))) &&
      Array.isArray(role.permissions) &&
      role.permissions.every((permission) => typeof permission === "string")
    );
  }

  // role.deleted: only identity fields are expected; extra role fields are ignored.
  return (
    role.description === undefined &&
    role.scope === undefined &&
    role.acquisitionType === undefined &&
    role.approvalPolicy === undefined &&
    role.applicableFor === undefined &&
    role.permissions === undefined
  );
}

function getRoleId(payload: RolePayload): string | undefined {
  const candidate = payload.role?.id;
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toAction(eventType: RoleEventType): RoleAction {
  if (eventType === "role.updated") return "updated_role";
  return "deleted_role";
}

function normalizeJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

async function persistRoleEvent(
  tx: Prisma.TransactionClient,
  payload: RolePayload,
): Promise<RoleAction> {
  const roleId = getRoleId(payload);
  if (!roleId) throw new Error("Missing role id.");

  if (payload.eventType === "role.deleted") {
    await tx.authzRole.deleteMany({
      where: { id: roleId },
    });
    return "deleted_role";
  }

  const role = payload.role;
  if (!role) throw new Error("Missing role.");
  const appId = payload.appId?.trim();
  if (!appId) throw new Error("Missing appId.");

  const name = role.name.trim().length > 0 ? role.name.trim() : roleId;

  const updateData = {
    name,
    appId,
    description: typeof role.description === "string" ? role.description : null,
    scope: typeof role.scope === "string" ? role.scope : null,
    acquisitionType: typeof role.acquisitionType === "string" ? role.acquisitionType : null,
    approvalPolicy: typeof role.approvalPolicy === "string" ? role.approvalPolicy : null,
    applicableFor: normalizeJsonValue(role.applicableFor ?? []) ?? Prisma.JsonNull,
    permissions: normalizeJsonValue(role.permissions ?? []),
  };

  const existingRole = await tx.authzRole.findUnique({
    where: { id: roleId },
    select: { id: true },
  });

  await tx.authzRole.upsert({
    where: { id: roleId },
    update: updateData,
    create: {
      id: roleId,
      ...updateData,
    },
  });

  return existingRole ? "updated_role" : "created_role";
}

const postHandler = async (req: NextRequest) => {
  const appSecret = getAppSecret();
  if (!appSecret) {
    return fail("misconfigured_secret", "Set BRIDGE_APP_SECRET or NEUP_APP_SECRET.", 500);
  }

  const encHeader = req.headers.get("x-bridge-encryption") || "";
  const sigAlgHeader = req.headers.get("x-bridge-signature-alg") || "";
  const signature = req.headers.get("x-bridge-signature") || "";

  if (encHeader.toLowerCase() !== "aes-256-gcm" || sigAlgHeader.toLowerCase() !== "hmac-sha256") {
    return fail("invalid_headers", "Unsupported bridge encryption/signature headers.");
  }

  let body: EncryptedEnvelope;
  try {
    body = (await req.json()) as EncryptedEnvelope;
  } catch {
    return fail("invalid_body", "Body must be valid JSON.");
  }

  if (!isValidEnvelope(body)) {
    return fail("invalid_body", "Missing required encrypted envelope fields.");
  }

  if (!verifySignature(body.iv, body.tag, body.data, signature, appSecret)) {
    return fail("invalid_signature");
  }

  let decryptedText = "";
  try {
    decryptedText = decryptEnvelope(body.iv, body.tag, body.data, appSecret);
  } catch (error) {
    await logProblem(error, "bridge/webhook.v1/roles decrypt");
    return fail("decrypt_failed");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decryptedText);
  } catch {
    return fail("decrypt_failed", "Decrypted payload is not valid JSON.");
  }

  const payloads = Array.isArray(parsed) ? parsed : [parsed];
  if (!payloads.length || !payloads.every(isValidRolePayload)) {
    return fail("invalid_payload", "Decrypted payload shape is invalid.");
  }

  const actions: RoleAction[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      for (const payload of payloads) {
        const action = await persistRoleEvent(tx, payload);
        actions.push(action);
      }
    });
  } catch (error) {
    await logProblem(error, "bridge/webhook.v1/roles persist");
    return fail("record_failed");
  }

  return NextResponse.json({ success: true, actions });
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

export const POST = withRequestDevLog({ source: 'webhook', name: 'bridge/webhook.v1/roles:POST' }, postHandler);
export const GET = withRequestDevLog({ source: 'webhook', name: 'bridge/webhook.v1/roles:GET' }, getHandler);
