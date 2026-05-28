import { createDecipheriv, createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logProblem } from "@/services/problem-service";

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
  eventId: string;
  eventType: "account.updated";
  sourceAppId: "neup.account";
  occurredAt: string;
  appId: string;
  connectionId?: string;
  changedFields?: string[];
  account?: {
    neupId?: string;
    displayName?: string;
    displayImage?: string;
    gender?: string;
    dateOfBirth?: string;
    role?: string;
    isMinor?: boolean;
    accountType?: string;
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
    body.eventType === "account.updated" &&
    body.encrypted === true &&
    typeof body.iv === "string" &&
    typeof body.tag === "string" &&
    typeof body.data === "string"
  );
}

function isValidPayload(input: unknown): input is AccountUpdatePayload {
  const payload = input as AccountUpdatePayload;
  return (
    !!payload &&
    payload.eventType === "account.updated" &&
    payload.sourceAppId === "neup.account" &&
    typeof payload.eventId === "string" &&
    typeof payload.occurredAt === "string" &&
    typeof payload.appId === "string"
  );
}

async function persistAccountUpdate(payload: AccountUpdatePayload) {
  const account = payload.account ?? {};
  const neupId = account.neupId?.trim() || undefined;
  const connectionId = payload.connectionId?.trim() || undefined;

  const updateData = {
    ...(neupId ? { neupId } : {}),
    ...(typeof account.displayName === "string" ? { displayName: account.displayName } : {}),
    ...(typeof account.displayImage === "string" ? { displayImage: account.displayImage } : {}),
    ...(typeof account.accountType === "string" ? { accountType: account.accountType } : {}),
    ...(connectionId ? { connectionId } : {}),
    ...(typeof account.role === "string" ? { roleId: account.role } : {}),
    accessedOn: new Date(),
  };

  if (neupId) {
    await prisma.account.upsert({
      where: { neupId },
      update: updateData,
      create: {
        id: crypto.randomUUID(),
        neupId,
        accountType: account.accountType || "individual",
        displayName: account.displayName ?? null,
        displayImage: account.displayImage ?? null,
        connectionId: connectionId ?? null,
        roleId: account.role ?? null,
        createdOn: new Date(),
        accessedOn: new Date(),
      },
    });
    return;
  }

  if (connectionId) {
    const result = await prisma.account.updateMany({
      where: { connectionId },
      data: updateData,
    });

    if (result.count > 0) return;
  }

  throw new Error("No matching account target to persist update.");
}

export async function POST(req: NextRequest) {
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
    await logProblem(error, "bridge/webhook.v1/account/updates decrypt");
    return fail("decrypt_failed");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(decryptedText);
  } catch {
    return fail("decrypt_failed", "Decrypted payload is not valid JSON.");
  }

  if (!isValidPayload(payload)) {
    return fail("invalid_payload", "Decrypted payload shape is invalid.");
  }

  try {
    await persistAccountUpdate(payload);
  } catch (error) {
    await logProblem(error, "bridge/webhook.v1/account/updates persist");
    return fail("record_failed");
  }

  return NextResponse.json({ success: true });
}

