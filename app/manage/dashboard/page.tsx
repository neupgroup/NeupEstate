
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getProperties } from "@/services/property-service";
import { getAccounts } from "@/services/account-service";
import { getAgencyAgentMapsByAgent } from "@/services/agency-agent-map-service";
import { getAccountIdFromJWT } from "@/services/neupid/check-auth-web";
import { Clock, DollarSign, CalendarCheck, Home } from "lucide-react";
import { DailySchedule } from "@/components/manage/daily-schedule";
import { requirePagePermission } from "@/logica/auth/page-guard";
import { PERMISSIONS } from "@/logica/auth/permissions";
import { AgencyInvitationsCard } from "@/components/manage/agency-invitations-card";

async function getStats() {
    const allProperties = await getProperties({ includeInactive: true });
    
    const listedThisWeek = allProperties.filter(p => {
        if (!p.createdAt) return false;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(p.createdAt) >= sevenDaysAgo;
    }).length;

    const pendingCount = allProperties.filter(p => !p.isApproved).length;

    // Placeholders for future data points that are not yet tracked
    const soldThisWeek = 0;
    const meetingsThisWeek = 0;
    
    return {
        listedThisWeek,
        soldThisWeek,
        meetingsThisWeek,
        pendingCount,
    }
}

const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description: string }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

export default async function ManageDashboardPage() {
    await requirePagePermission(PERMISSIONS.manage.dashboardView);
    const [stats, accountId, accounts] = await Promise.all([
        getStats(),
        getAccountIdFromJWT(),
        getAccounts(),
    ]);

    const invitations = accountId
        ? (await getAgencyAgentMapsByAgent(accountId)).filter((link) => link.status === 'invited').map((link) => {
            const agency = accounts.find((account) => account.id === link.agencyId);
            return {
                id: link.id,
                agencyId: link.agencyId,
                agencyName: agency?.display_name ?? link.agencyId,
            };
        })
        : [];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">At a glance</h2>
                <p className="text-sm text-muted-foreground">
                    An overview of your real estate business.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Properties Listed This Week"
                    value={stats.listedThisWeek}
                    icon={<Home className="h-4 w-4 text-muted-foreground" />}
                    description="New properties added in the last 7 days."
                />
                <StatCard 
                    title="Properties Sold This Week"
                    value={stats.soldThisWeek}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    description="Sales completed in the last 7 days."
                />
                    <StatCard 
                    title="Total Meetings This Week"
                    value={stats.meetingsThisWeek}
                    icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
                    description="Scheduled client meetings this week."
                />
                <StatCard 
                    title="Pending Properties"
                    value={stats.pendingCount}
                    icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                    description="Properties awaiting your approval."
                />
            </div>

            <AgencyInvitationsCard invitations={invitations} />
            
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Schedule for the day</h2>
                <p className="text-sm text-muted-foreground">
                    A list of your appointments and tasks for today. Click on a task to view client details.
                </p>
            </div>
            <DailySchedule />
        </div>
    );
}
