
import { getJobOpenings } from '@/services/career-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, Clock, ChevronRight } from 'lucide-react';
import { SafeImage } from '@/components/safe-image';

export default async function CareersPage() {
    const jobOpenings = await getJobOpenings();

    return (
        <main className="flex-1 bg-secondary/30">
            {/* Hero Section */}
            <section className="relative bg-cover bg-center py-20 md:py-32" style={{ backgroundImage: "url('https://placehold.co/1920x500.png')" }} data-ai-hint="modern office people">
                <div className="absolute inset-0 bg-primary/80" />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center text-white">
                    <h1 className="text-4xl md:text-6xl font-headline font-bold">Join Our Team</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto">
                        We're building the future of real estate. Be a part of the revolution.
                    </p>
                </div>
            </section>

            {/* Life at Neup.Estate */}
            <section className="py-16 md:py-24 bg-background">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-headline font-bold text-gray-800">Life at Neup.Estate</h2>
                        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Innovation, collaboration, and a passion for what we do.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Placeholder Blog Posts */}
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <SafeImage src="https://placehold.co/600x400.png" data-ai-hint="team working office" alt="Team collaboration" width={600} height={400} className="w-full h-48 object-cover" />
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg mb-2">Our Collaborative Culture</h3>
                                <p className="text-sm text-muted-foreground">Discover how our teams work together to innovate and solve complex challenges in the real estate industry.</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <SafeImage src="https://placehold.co/600x400.png" data-ai-hint="diverse team portrait" alt="Team diversity" width={600} height={400} className="w-full h-48 object-cover" />
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg mb-2">Celebrating Diversity</h3>
                                <p className="text-sm text-muted-foreground">We believe diverse perspectives drive better outcomes. Learn about our commitment to an inclusive workplace.</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <SafeImage src="https://placehold.co/600x400.png" data-ai-hint="employee benefits infographic" alt="Employee benefits" width={600} height={400} className="w-full h-48 object-cover" />
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg mb-2">Perks and Benefits</h3>
                                <p className="text-sm text-muted-foreground">From comprehensive health plans to professional development, we invest in our team's growth and well-being.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
            
            {/* Open Positions */}
            <section className="py-16 md:py-24 bg-card">
                 <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-headline font-bold text-gray-800">Current Openings</h2>
                        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Find your next opportunity and make an impact.</p>
                    </div>
                    
                    <div className="max-w-4xl mx-auto space-y-4">
                        {jobOpenings.map(job => (
                            <Card key={job.id} className="hover:border-primary transition-colors">
                                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex-grow">
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-primary" />
                                            {job.title}
                                        </CardTitle>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                                            <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</div>
                                            <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{job.type}</div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button>
                                            Apply Now <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 </div>
            </section>
        </main>
    );
}
