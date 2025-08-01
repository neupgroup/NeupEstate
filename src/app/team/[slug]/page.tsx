
import { notFound } from 'next/navigation';
import { getTeamMemberBySlug } from '@/services/team-service';
import { SafeImage } from '@/components/safe-image';
import { Facebook, Twitter, Instagram, Linkedin, Mail } from 'lucide-react';
import { ClientLink } from '@/components/client-link';

export default async function TeamMemberPage({ params }: { params: { slug: string } }) {
    const member = await getTeamMemberBySlug(params.slug);

    if (!member) {
        notFound();
    }
    
    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <SafeImage 
                        src={member.photoUrl || "https://placehold.co/400x400.png"}
                        alt={member.name}
                        width={400}
                        height={400}
                        className="rounded-lg shadow-lg w-full aspect-square object-cover"
                        data-ai-hint="person portrait"
                        fallbackSrc="https://placehold.co/400x400.png"
                    />
                    <div className="mt-4 flex justify-start space-x-4">
                        {member.socialMedia?.linkedin && (
                            <ClientLink href={member.socialMedia.linkedin} target="_blank" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin /></ClientLink>
                        )}
                        {member.socialMedia?.twitter && (
                             <ClientLink href={member.socialMedia.twitter} target="_blank" className="text-muted-foreground hover:text-primary transition-colors"><Twitter /></ClientLink>
                        )}
                        {member.socialMedia?.facebook && (
                             <ClientLink href={member.socialMedia.facebook} target="_blank" className="text-muted-foreground hover:text-primary transition-colors"><Facebook /></ClientLink>
                        )}
                         {member.socialMedia?.instagram && (
                             <ClientLink href={member.socialMedia.instagram} target="_blank" className="text-muted-foreground hover:text-primary transition-colors"><Instagram /></ClientLink>
                        )}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <h1 className="text-4xl font-headline font-bold">{member.name}</h1>
                    <p className="text-xl text-primary font-semibold mt-1">{member.position}</p>
                    <div className="mt-6 border-t pt-6 space-y-4">
                        <h2 className="text-2xl font-headline font-semibold">About {member.name.split(' ')[0]}</h2>
                        <p className="text-muted-foreground whitespace-pre-line">{member.about}</p>
                        {member.moreDetails && <p className="text-muted-foreground whitespace-pre-line">{member.moreDetails}</p>}
                    </div>
                </div>
            </div>
        </main>
    )
}
