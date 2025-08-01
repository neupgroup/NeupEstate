
'use server';

import type { Review } from '@/types';

// Mock data, as there's no real review system yet.
const mockReviews: Review[] = [
  { id: 'rev-1', targetId: 'agent-1', targetType: 'agent', targetName: 'John Doe', authorName: 'Alice Johnson', rating: 5, reviewText: 'John was incredibly helpful and professional throughout the entire process. He found us the perfect home!', createdAt: new Date().toISOString() },
  { id: 'rev-2', targetId: 'agency-1', targetType: 'agency', targetName: 'Skyline Properties', authorName: 'Bob Williams', rating: 4, reviewText: 'A great agency with a fantastic selection of properties. The process was mostly smooth.', createdAt: new Date().toISOString() },
  { id: 'rev-3', targetId: 'agent-2', targetType: 'agent', targetName: 'Jane Smith', authorName: 'Charlie Brown', rating: 5, reviewText: 'Jane is the best! So knowledgeable about the local market.', createdAt: new Date().toISOString() },
  { id: 'rev-4', targetId: 'agency-2', targetType: 'agency', targetName: 'Horizon Realty', authorName: 'Diana Prince', rating: 3, reviewText: 'They were okay, but communication could have been better.', createdAt: new Date().toISOString() },
];

export async function getReviews(): Promise<{ agentReviews: Review[], agencyReviews: Review[] }> {
    // In a real application, this would fetch reviews from a database.
    // For now, we filter our mock data.
    return new Promise((resolve) => {
        setTimeout(() => {
            const agentReviews = mockReviews.filter(r => r.targetType === 'agent');
            const agencyReviews = mockReviews.filter(r => r.targetType === 'agency');
            resolve({ agentReviews, agencyReviews });
        }, 500); // Simulate network delay
    });
}

export async function getReviewsByAgent(agentId: string): Promise<Review[]> {
    const { agentReviews } = await getReviews();
    return agentReviews.filter(review => review.targetId === agentId);
}
