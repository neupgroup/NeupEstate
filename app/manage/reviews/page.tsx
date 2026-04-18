
import { getReviews } from '@/services/review-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

function getInitials(name: string) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

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
    const { agentReviews, agencyReviews } = await getReviews();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold leading-none tracking-tight">
                Reviews
            </h2>
            <Tabs defaultValue="agents">
                <TabsList>
                    <TabsTrigger value="agents">Agent Reviews</TabsTrigger>
                    <TabsTrigger value="agencies">Agency Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="agents" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reviews for Agents</CardTitle>
                            <CardDescription>
                                {agentReviews.length} reviews found for your agents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {agentReviews.map(review => (
                                <div key={review.id} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold">{review.targetName}</h4>
                                            <p className="text-sm text-muted-foreground">Reviewed by: {review.authorName}</p>
                                        </div>
                                        <StarRating rating={review.rating} />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-700 italic">"{review.reviewText}"</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="agencies" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reviews for Agencies</CardTitle>
                            <CardDescription>
                                {agencyReviews.length} reviews found for your agencies.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {agencyReviews.map(review => (
                                <div key={review.id} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold">{review.targetName}</h4>
                                            <p className="text-sm text-muted-foreground">Reviewed by: {review.authorName}</p>
                                        </div>
                                        <StarRating rating={review.rating} />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-700 italic">"{review.reviewText}"</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
