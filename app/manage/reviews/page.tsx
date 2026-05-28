
import { getReviews } from '@/services/review-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
}

export default async function ManageReviewsPage() {
    await requirePagePermission(PERMISSIONS.manage.selfReviewsView);
    const reviews = await getReviews();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold leading-none tracking-tight">
                Reviews
            </h2>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                    <CardDescription>
                        {reviews.length} reviews captured so far.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">Reviewer: {review.reviewedBy}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Reviewed on {new Date(review.reviewedOn).toLocaleDateString()}
                                    </p>
                                </div>
                                <StarRating rating={review.rating} />
                            </div>
                            <p className="mt-2 text-sm text-gray-700 italic">"{review.review}"</p>
                            {review.response && (
                                <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
                                    <p className="font-medium">Response</p>
                                    <p className="text-muted-foreground">{review.response}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
