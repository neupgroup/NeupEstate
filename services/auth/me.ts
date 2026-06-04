import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/logica/core/prisma';
import { buildHandshakeGrantUrl, getAuthenticatedAccount } from '@/services/auth';

type MeRow = {
  neupId?: string | null;
  accountType?: string | null;
  displayName?: string | null;
  displayImage?: string | null;
};

export type AuthenticatedMe = {
  accountId: string;
  neupId: string | null;
  guest: boolean;
  accountType: string;
  registered: boolean;
  displayName: string | null;
  displayImage: string | null;
};

function readAccountRow(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      neupId: true,
      accountType: true,
      displayName: true,
      displayImage: true,
    },
  }) as Promise<MeRow | null>;
}

async function readAccountRowFallback(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      accountType: true,
      displayName: true,
      displayImage: true,
    },
  }) as Promise<MeRow | null>;
}

export async function getAuthenticatedMeData(): Promise<AuthenticatedMe | null> {
  const result = await getAuthenticatedAccount();
  if (!result.success) return null;

  const account = result.account;

  try {
    let row: MeRow | null = null;

    try {
      row = await readAccountRow(account.aid);
    } catch {
      row = await readAccountRowFallback(account.aid);
    }

    return {
      accountId: account.aid,
      neupId: row?.neupId ?? account.nid ?? null,
      guest: account.guest === 1,
      accountType: row?.accountType ?? (account.guest === 1 ? 'guest' : 'individual'),
      registered: (row?.accountType ?? (account.guest === 1 ? 'guest' : 'individual')) !== 'guest',
      displayName: row?.displayName ?? null,
      displayImage: row?.displayImage ?? null,
    };
  } catch {
    return {
      accountId: account.aid,
      neupId: account.nid ?? null,
      guest: account.guest === 1,
      accountType: account.guest === 1 ? 'guest' : 'individual',
      registered: account.guest !== 1,
      displayName: null,
      displayImage: null,
    };
  }
}

export async function getAuthenticatedMeResponse(req: NextRequest) {
  const result = await getAuthenticatedAccount();
  if (!result.success) {
    const redirectTo = buildHandshakeGrantUrl(req, req.nextUrl.href);
    return NextResponse.json(
      { accountId: null, reason: result.reason, redirectTo },
      { status: 401 },
    );
  }
  const me = await getAuthenticatedMeData();
  return NextResponse.json(me);
}
