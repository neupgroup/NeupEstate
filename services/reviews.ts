'use server';

import type { Review } from '@/types';

const reviews: Review[] = [
  {
    id: 'rev-1', reviewedBy: 'account-101', rating: 5,
    review: 'John was incredibly helpful and professional throughout the entire process. He found us the perfect home!',
    reviewedOn: new Date().toISOString(), response: 'Thank you for the kind words. Happy to help!', responseBy: 'agent-1', responseOn: new Date().toISOString(),
  },
  {
    id: 'rev-2', reviewedBy: 'account-202', rating: 4,
    review: 'A great agency with a fantastic selection of properties. The process was mostly smooth.',
    reviewedOn: new Date().toISOString(), responseBy: 'agency-1', responseOn: new Date().toISOString(),
  },
  {
    id: 'rev-3', reviewedBy: 'account-303', rating: 5,
    review: 'Jane is the best! So knowledgeable about the local market.',
    reviewedOn: new Date().toISOString(), responseBy: 'agent-2', responseOn: new Date().toISOString(),
  },
  {
    id: 'rev-4', reviewedBy: 'account-404', rating: 3,
    review: 'They were okay, but communication could have been better.',
    reviewedOn: new Date().toISOString(),
  },
];

/** Returns the review collection as a JSON-serializable payload. */
export async function getReviews(): Promise<Review[]> {
  return reviews;
}

export async function getReviewsByAgent(agentId: string): Promise<Review[]> {
  const payload = await getReviews();
  return payload.filter((review) => review.responseBy === agentId);
}
