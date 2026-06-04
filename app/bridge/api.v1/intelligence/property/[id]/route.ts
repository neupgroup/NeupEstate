/**
 * GET /bridge/api.v1/intelligence/property/[id]
 *
 * Returns a converted competitor listing by competitor_listings.id, with the
 * source page joined in for metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Missing listing id.' },
      { status: 400 },
    );
  }

  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT
        l.*,
        p.id AS "sourcePageId",
        p.title AS "sourceTitle",
        p.source AS "sourceUrl",
        p."lastLoggedStatus" AS "sourceLastLoggedStatus",
        p."lastLoggedOn" AS "sourceLastLoggedOn",
        p."listedOn" AS "sourceListedOn",
        p.details AS "sourceDetails"
      FROM "competitor_listings" l
      LEFT JOIN "competitor_pages" p ON p.id = l."competitorPageId"
      WHERE l.id = ${id}
      LIMIT 1
    `;

    const listing = rows[0] ?? null;
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      listing: {
        id: listing.id,
        competitorPageId: listing.competitorPageId,
        title: listing.title,
        description: listing.description,
        purpose: listing.purpose,
        agentName: listing.agentName,
        price: listing.price,
        priceBasis: listing.priceBasis,
        isSold: listing.isSold,
        details: listing.details,
        loggedOn: listing.loggedOn,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
      sourcePage: listing.sourceUrl
        ? {
            id: listing.sourcePageId,
            title: listing.sourceTitle,
            source: listing.sourceUrl,
            lastLoggedStatus: listing.sourceLastLoggedStatus,
            lastLoggedOn: listing.sourceLastLoggedOn,
            listedOn: listing.sourceListedOn,
            details: listing.sourceDetails,
          }
        : null,
    });
  } catch (err) {
    await logProblem(err, 'bridge/api.v1/intelligence/property/[id]');
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
