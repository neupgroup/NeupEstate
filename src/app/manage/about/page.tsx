
import { getAboutPageContent } from '@/services/site-content-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AboutContentForm } from '@/components/manage/about-content-form';
import { ClientLink } from '@/components/client-link';
import { buttonVariants } from '@/components/ui/button';
import { Users } from 'lucide-react';

export default async function ManageAboutPage() {
  const aboutContent = await getAboutPageContent();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Configure About Page</CardTitle>
                <CardDescription>
                    Update the content displayed on the public "About Us" page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AboutContentForm initialContent={aboutContent} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Manage Page Sections</CardTitle>
                <CardDescription>
                    Manage other sections of the about page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <ClientLink href="/manage/team" className={buttonVariants({ variant: 'outline' })}>
                    <Users className="mr-2 h-4 w-4"/>
                    Manage Team Members
                </ClientLink>
            </CardContent>
        </Card>
    </div>
  );
}
