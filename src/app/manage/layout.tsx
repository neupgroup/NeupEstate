

import {
    Home, Users, Settings, Upload, FilePlus2, Building, Wand2, Sparkles, ShieldAlert, UserCog,
    LayoutDashboard, LineChart, Package, MessageSquareHeart, FileQuestion, Landmark, CalendarCheck, FileText,
    Banknote, Info, Quote, HelpCircle, Book, Briefcase, Contact, Newspaper, FileSearch,
    BookOpen, Lightbulb, UserCheck, Eye, Bell, LifeBuoy, Bookmark, Star, Flame
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ClientLink } from '@/components/client-link';
import { WhatsAppIcon } from '@/components/icons';

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr] items-start">

        <aside className="hidden md:block sticky top-16 self-start border-r h-[calc(100vh-4rem)] bg-secondary">
            <nav className={cn("flex flex-col space-y-1 p-4 overflow-y-auto h-full")}>
                
                <ClientLink href="/manage" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                </ClientLink>
                <ClientLink href="/manage/analytics" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <LineChart className="mr-2 h-4 w-4" />
                    Analytics
                </ClientLink>
                <ClientLink href="/manage/schedule" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Schedule
                </ClientLink>

                <h3 className="pt-4 pb-1 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Property</h3>
                <ClientLink href="/manage/properties" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Home className="mr-2 h-4 w-4" />
                    Properties
                </ClientLink>
                <ClientLink href="/manage/collection" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Package className="mr-2 h-4 w-4" />
                    Collection
                </ClientLink>
                
                <h3 className="pt-4 pb-1 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Clients</h3>
                <ClientLink href="/manage/leads" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Flame className="mr-2 h-4 w-4" />
                    Leads
                </ClientLink>
                <ClientLink href="/manage/messages" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <MessageSquareHeart className="mr-2 h-4 w-4" />
                    Messages
                </ClientLink>
                <ClientLink href="/manage/inquiries" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Inquiries
                </ClientLink>
                 <ClientLink href="/manage/saved" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    Saved Properties
                </ClientLink>
                <ClientLink href="/manage/requests" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <FileSearch className="mr-2 h-4 w-4" />
                    Property Requests
                </ClientLink>
                 <ClientLink href="/manage/sales-requests" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Landmark className="mr-2 h-4 w-4" />
                    Sales Request
                </ClientLink>
                 <ClientLink href="/manage/visit-requests" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Visit Request
                </ClientLink>
                 <ClientLink href="/manage/mortgage-requests" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Banknote className="mr-2 h-4 w-4" />
                    Mortgage Request
                </ClientLink>
                <ClientLink href="/manage/contact" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Contact className="mr-2 h-4 w-4" />
                    Contact
                </ClientLink>

                <h3 className="pt-4 pb-1 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">About</h3>
                 <ClientLink href="/manage/about" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Info className="mr-2 h-4 w-4" />
                    About
                </ClientLink>
                <ClientLink href="/manage/reviews" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Star className="mr-2 h-4 w-4" />
                    Reviews
                </ClientLink>
                <ClientLink href="/manage/faq" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    FAQs
                </ClientLink>
                <ClientLink href="/manage/notifications" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notification
                </ClientLink>
                <ClientLink href="/careers" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Careers
                </ClientLink>
                <ClientLink href="/manage/newsletter" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Newspaper className="mr-2 h-4 w-4" />
                    Newsletter
                </ClientLink>
                 <ClientLink href="/manage/team" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Users className="mr-2 h-4 w-4" />
                    Team
                </ClientLink>

                <h3 className="pt-4 pb-1 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Content</h3>
                <ClientLink href="/manage/blogs" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Book className="mr-2 h-4 w-4" />
                    Blogs
                </ClientLink>
                <ClientLink href="/manage/market-insights" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Market Insights
                </ClientLink>

                <h3 className="pt-4 pb-1 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Management</h3>
                 <ClientLink href="/manage/agents" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Users className="mr-2 h-4 w-4" />
                    Agents
                </ClientLink>
                <ClientLink href="/manage/users" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Users
                </ClientLink>
                <ClientLink href="/manage/settings" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </ClientLink>
                 <ClientLink href="/manage/support" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')}>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    Support
                </ClientLink>
            </nav>
        </aside>

        <main className="py-8">{children}</main>

      </div>
    </div>
  );
}
