/**
 * ::neup.documentation::bridge-inquiry-route
 * ::api POST /bridge/api.v1/inquiry
 *
 * Creates a property inquiry for a bridge client.
 *
 * ::public
 *
 * This route accepts a property identifier plus optional contact details and
 * message content.
 *
 * Inputs:
 * - `POST /bridge/api.v1/inquiry?property=<propertyId>`
 * - JSON body fields: `phone`, `email`, `message`, `name`, `account_id`
 *
 * Validation:
 * - `property` is required
 * - at least one of `phone` or `email` is required
 *
 * Response behavior:
 * - `201` when the inquiry is created
 * - `400` when required inputs are missing
 * - `404` when the property does not exist
 * - `500` on unexpected server failure
 *
 * ::public end
 *
 * ::private
 *
 * The bridge payload is intentionally looser than the site inquiry form.
 * Missing optional database-backed fields are normalized in
 * `createBridgeInquiry()` so older bridge clients can submit only a phone
 * number or only an email address.
 *
 * ::private end
 * ::end
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createBridgeInquiry, InquiryServiceError } from '@/services/inquiry-service';
import { logProblem } from '@/services/problem-service';
import { withRequestDevLog } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const postHandler = async (req: NextRequest) => {
  try {
    let body: Record<string, unknown> = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const propertyId =
      req.nextUrl.searchParams.get('property')?.trim() ||
      req.nextUrl.searchParams.get('property_id')?.trim() ||
      (typeof body.property === 'string' ? body.property.trim() : '') ||
      (typeof body.property_id === 'string' ? body.property_id.trim() : '');

    const inquiryId = await createBridgeInquiry({
      propertyId,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
      message: typeof body.message === 'string' ? body.message : undefined,
      name: typeof body.name === 'string' ? body.name : undefined,
      accountId: typeof body.account_id === 'string' ? body.account_id : undefined,
    });

    revalidatePath('/manage/inquiries');

    return NextResponse.json(
      { success: true, inquiryId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InquiryServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    await logProblem(error, 'bridge/api.v1/inquiry:POST');
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
};

export const POST = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/inquiry:POST' }, postHandler);
