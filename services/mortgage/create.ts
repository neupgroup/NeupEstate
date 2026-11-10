'use server';

import { prisma } from '@neup/core/database/prisma';
import type { CreateMortgageRequestFormValues } from '@/types';

export async function createMortgageRequest(data: CreateMortgageRequestFormValues): Promise<string> {
  try {
    const request = await prisma.mortgageRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        age: data.age,
        income: data.income,
        moreDetails: data.moreDetails,
        contactMethods: data.contactMethods,
        status: 'new',
      },
      select: { id: true },
    });
    return request.id;
  } catch (error) {
    throw new Error('Failed to submit mortgage request.');
  }
}
