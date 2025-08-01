
import { SafeImage } from '@/components/safe-image';
import { ClientLink } from '@/components/client-link';
import { Eye, Target, Users, Bot, AlertCircle } from 'lucide-react';
import { getTeamMembers } from '@/services/team-service';
import { getAboutPageContent } from '@/services/site-content-service';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const features = [
    {
        icon: <Bot className="h-8 w-8 text-primary" />,
        title: "AI-Powered Search",
        description: "Our intelligent search understands you, translating your everyday language into precise property filters to find exactly what you're looking for."
    },
    {
        icon: <Users className="h-8 w-8 text-primary" />,
        title: "Trusted Partners",
        description: "We collaborate with the most reputable agencies in the industry, ensuring every listing is verified, trustworthy, and of the highest quality."
    },
    {
        icon: <Eye className="h-8 w-8 text-primary" />,
        title: "Market Insights",
        description: "Leverage our AI-driven analytics to understand market trends, property values, and make informed decisions with confidence."
    }
]

export default async function AboutPage() {
  const teamMembers = await getTeamMembers();
  const aboutContent = await getAboutPageContent();

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-cover bg-center py-20 md:py-32" style={{ backgroundImage: "url('https://placehold.co/1920x600.png')" }} data-ai-hint="office building">
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">About Neup.Estate</h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto">
            Redefining the real estate experience through technology and trust.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                    <h2 className="text-3xl md:text-4xl font-headline font-bold text-gray-800 mb-4">Our Mission</h2>
                    <p className="text-muted-foreground mb-4 whitespace-pre-line">
                        {aboutContent.missionStatement}
                    </p>
                </div>
                <div className="flex justify-center">
                    <Target className="h-48 w-48 text-primary/20" />
                </div>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-secondary/70">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-gray-800">Why Choose Us?</h2>
                <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">We're not just another listing site. We are your intelligent partner in real estate.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {features.map((feature) => (
                    <div key={feature.title} className="text-center p-6 bg-card rounded-lg shadow-sm">
                        <div className="flex justify-center mb-4">{feature.icon}</div>
                        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-gray-800">Meet the Team</h2>
            <p className="mt-2 text-muted-foreground">The minds behind the innovation.</p>
          </div>
          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <div key={member.id} className="text-center bg-card p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <SafeImage
                    src={member.photoUrl || "https://placehold.co/200x200.png"}
                    alt={member.name}
                    width={200}
                    height={200}
                    className="rounded-full mx-auto mb-4 w-32 h-32 object-cover border-4 border-secondary"
                    data-ai-hint={"person portrait"}
                    fallbackSrc="https://placehold.co/200x200.png"
                  />
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <p className="text-primary">{member.position}</p>
                  {member.about && (
                    <p className="text-sm text-muted-foreground mt-2">
                        {member.about.substring(0, 120)}{member.about.length > 120 && '...'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Team Information Coming Soon</AlertTitle>
                <AlertDescription>
                    We are currently updating our team page. Please check back later to meet the talented individuals behind our success.
                </AlertDescription>
            </Alert>
          )}
        </div>
      </section>

       {/* CTA Section */}
        <section className="bg-secondary/70">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                <h2 className="text-3xl font-headline font-bold">Ready to Find Your Property?</h2>
                <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
                    Your next home is just a few clicks away. Start your search now and experience the future of real estate.
                </p>
                <div className="mt-6">
                    <ClientLink href="/search" className="inline-block bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors">
                        Start Searching
                    </ClientLink>
                </div>
            </div>
        </section>
    </>
  );
}
