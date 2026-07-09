"use server";

import { prisma } from '@/core/database/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentAccountId } from '@/app/actions';

export async function createIntelligenceCriteriaAction(formData: FormData) {
  const accountId = await getCurrentAccountId();
  if (!accountId) {
    throw new Error('Authentication required.');
  }

  const cLocation = String(formData.get('cLocation') ?? '').trim();
  const cPurpose = String(formData.get('cPurpose') ?? '').trim();
  const cMinBudgetRaw = String(formData.get('cMinBudget') ?? '').trim();
  const cMaxBudgetRaw = String(formData.get('cMaxBudget') ?? '').trim();
  const cCompetitorId = String(formData.get('cCompetitorId') ?? '').trim();
  const cType = String(formData.get('cType') ?? '').trim();

  if (!cLocation) throw new Error('Location is required.');
  if (!cPurpose) throw new Error('Purpose is required.');

  try {
    await prisma.intelligenceMapping.create({
      data: {
        accountId,
        cLocation,
        cPurpose,
        cMinBudget: cMinBudgetRaw ? Number(cMinBudgetRaw) : null,
        cMaxBudget: cMaxBudgetRaw ? Number(cMaxBudgetRaw) : null,
        cCompetitorId: cCompetitorId || null,
        cType: cType || null,
      },
    });

    revalidatePath('/manage/intelligence/criteria');
    revalidatePath('/manage/intelligence');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to create criteria.');
  }
}

export async function deleteIntelligenceCriteriaAction(mappingId: string) {
  const accountId = await getCurrentAccountId();
  if (!accountId) {
    throw new Error('Authentication required.');
  }

  try {
    await prisma.intelligenceMapping.deleteMany({
      where: { id: mappingId, accountId },
    });

    revalidatePath('/manage/intelligence/criteria');
    revalidatePath('/manage/intelligence');
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to delete criteria.');
  }
}
