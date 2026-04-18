
import { notFound } from 'next/navigation';
import { getAgentBySlug } from '@/services/agent-service';
import { getPropertiesByAgent } from '@/services/property-service';
import { getReviewsByAgent } from '@/services/review-service';
import { SafeImage } from '@/components/safe-image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyCard } from '@/components/property-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mail, Home, Star, MessageSquare, Phone } from 'lucide-react';
import { ClientLink } from '@/components/client-link';
import { Button } from '@/components/ui/button';

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
}

export default async function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const agent = await getAgentBySlug(slug);
    
    if (!agent) {
        notFound();
    }

    const [properties, reviews] = await Promise.all([
        getPropertiesByAgent(agent.id),
        getReviewsByAgent(agent.id)
    ]);
    
    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length
        : 0;

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <section>
                <Card className="overflow-hidden">
                    <CardContent className="p-0 flex flex-col md:flex-row">
                        <div className="md:w-1/3">
                            <SafeImage 
                                src={agent.photoUrl || "https://placehold.co/400x400.png"}
                                alt={agent.name}
                                width={400}
                                height={400}
                                className="w-full h-full object-cover"
                                data-ai-hint="person portrait"
                                fallbackSrc="https://placehold.co/400x400.png"
                            />
                        </div>
                        <div className="md:w-2/3 p-6 flex flex-col">
                            <h1 className="text-4xl font-headline font-bold">{agent.name}</h1>
                            <p className="text-xl text-primary font-semibold mt-1">{agent.location}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <StarRating rating={averageRating} />
                                <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
                            </div>

                            <div className="mt-4 text-muted-foreground space-y-2">
                               {agent.contact.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {agent.contact.email}</p>}
                               {agent.contact.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {agent.contact.phone}</p>}
                            </div>

                            <div className="mt-auto pt-4">
                                 <ClientLink href={`/agents/${agent.slug}/contact`}>
                                    <Button>
                                        <MessageSquare className="mr-2 h-4 w-4"/>
                                        Contact Now
                                    </Button>
                                </ClientLink>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section>
                <h2 className="text-3xl font-headline font-bold mb-6 flex items-center gap-3">
                    <Home className="h-7 w-7 text-primary" />
                    Listings by {agent.name.split(' ')[0]}
                </h2>
                {properties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map(prop => <PropertyCard key={prop.id} property={prop} />)}
                    </div>
                ) : (
                     <Alert>
                        <Home className="h-4 w-4" />
                        <AlertTitle>No Listings Found</AlertTitle>
                        <AlertDescription>This agent currently has no active property listings.</AlertDescription>
                    </Alert>
                )}
            </section>

            <section>
                 <h2 className="text-3xl font-headline font-bold mb-6 flex items-center gap-3">
                    <Star className="h-7 w-7 text-primary" />
                    Reviews for {agent.name.split(' ')[0]}
                </h2>
                 {reviews.length > 0 ? (
                    <div className="space-y-4">
                        {reviews.map(review => (
                             <Card key={review.id}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold">{review.authorName}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Reviewed on {new Date(review.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <StarRating rating={review.rating} />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-700 italic">"{review.reviewText}"</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Alert>
                        <Star className="h-4 w-4" />
                        <AlertTitle>No Reviews Yet</AlertTitle>
                        <AlertDescription>This agent has not received any reviews.</AlertDescription>
                    </Alert>
                )}
            </section>
        </main>
    )
}
