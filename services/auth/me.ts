import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildHandshakeGrantUrl, getAuthenticatedAccount } from '@/services/auth';

type MeRow = {
  neupId?: string | null;
  accountType?: string | null;
  registered?: boolean | null;
  displayName?: string | null;
  displayImage?: string | null;
};

function readAccountRow(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      neupId: true,
      accountType: true,
      registered: true,
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
      registered: true,
      displayName: true,
      displayImage: true,
    },
  }) as Promise<MeRow | null>;
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

  const account = result.account;

  try {
    let row: MeRow | null = null;

    try {
      row = await readAccountRow(account.aid);
    } catch {
      row = await readAccountRowFallback(account.aid);
    }

    return NextResponse.json({
      accountId: account.aid,
      neupId: row?.neupId ?? account.nid ?? null,
      guest: account.guest === 1,
      accountType: row?.accountType ?? (account.guest === 1 ? 'guest' : 'individual'),
      registered: row?.registered ?? (account.guest !== 1),
      displayName: row?.displayName ?? null,
      displayImage: row?.displayImage ?? null,
    });
  } catch {
    return NextResponse.json({
      accountId: account.aid,
      neupId: account.nid ?? null,
      guest: account.guest === 1,
      accountType: account.guest === 1 ? 'guest' : 'individual',
      registered: account.guest !== 1,
      displayName: null,
      displayImage: null,
    });
  }
}