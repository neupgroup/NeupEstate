
import { notFound } from 'next/navigation';
import { getAgentBySlug } from '@/services/agent-service';
import { SafeImage } from '@/components/safe-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';
import { ClientLink } from '@/components/client-link';

export default async function AgentContactPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const agent = await getAgentBySlug(slug);

    if (!agent) {
        notFound();
    }
    
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center items-center">
                    <SafeImage
                        src={agent.photoUrl || "https://placehold.co/200x200.png"}
                        alt={agent.name}
                        width={128}
                        height={128}
                        className="rounded-full w-32 h-32 object-cover border-4 border-secondary shadow-lg"
                        data-ai-hint="person portrait"
                        fallbackSrc="https://placehold.co/200x200.png"
                    />
                    <div className="pt-4">
                        <CardTitle className="text-2xl">{agent.name}</CardTitle>
                        <CardDescription>{agent.location}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-lg font-semibold text-center">Contact Options</h3>
                    <div className="space-y-2">
                        {agent.contact.phone && (
                            <Button className="w-full justify-start" asChild>
                                <a href={`tel:${agent.contact.phone}`}>
                                    <Phone className="mr-4 h-5 w-5"/> Call Agent
                                </a>
                            </Button>
                        )}
                         {agent.contact.phone && (
                            <Button className="w-full justify-start bg-green-500 hover:bg-green-600" asChild>
                                <a href={`https://wa.me/${agent.contact.phone.replace(/[^0-9]/g, '')}`} target="_blank">
                                    <WhatsAppIcon className="mr-4 h-5 w-5"/> Start WhatsApp Chat
                                </a>
                            </Button>
                        )}
                        {agent.contact.email && (
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <a href={`mailto:${agent.contact.email}`}>
                                    <Mail className="mr-4 h-5 w-5"/> Send Email
                                </a>
                            </Button>
                        )}
                         <Button variant="outline" className="w-full justify-start" disabled>
                            <MessageSquare className="mr-4 h-5 w-5"/> Message (Coming Soon)
                        </Button>
                    </div>
                     <div className="pt-4 text-center">
                         <ClientLink href={`/agents/${agent.slug}`}>
                            <Button variant="link">Back to profile</Button>
                        </ClientLink>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
