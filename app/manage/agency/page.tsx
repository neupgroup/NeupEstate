import { requireAuth } from '@/services/auth';
import { getAgencyMapByAccount } from '@/services/agency-customization-service';
import { getAgencyById } from '@/services/agency-service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ClientLink } from '@/components/client-link';
import { SafeImage } from '@/components/safe-image';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  AlertCircle,
  Edit,
  Users,
  Building2,
} from 'lucide-react';

export default async function ManageAgencyPage() {
  // Require authentication
  const account = await requireAuth();

  // Get the user's agency mapping
  const agencyMap = await getAgencyMapByAccount(account.aid);

  if (!agencyMap) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            My Agency
          </h2>
          <p className="text-sm text-muted-foreground">
            Your agency profile and information.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Agency Found</AlertTitle>
          <AlertDescription>
            You are not currently associated with any agency. Contact your administrator to be
            added to an agency.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get the agency details
  const agency = await getAgencyById(agencyMap.agencyAccountId);

  if (!agency) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            My Agency
          </h2>
          <p className="text-sm text-muted-foreground">
            Your agency profile and information.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Agency Not Found</AlertTitle>
          <AlertDescription>
            The agency associated with your account could not be found. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            My Agency
          </h2>
          <p className="text-sm text-muted-foreground">
            Your agency profile and information.
          </p>
        </div>
        <div className="flex gap-2">
          <ClientLink
            href={`/manage/agencies/${agency.id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Agency
          </ClientLink>
          <ClientLink href="/manage/agencies" className={buttonVariants({ variant: 'outline' })}>
            <Building className="mr-2 h-4 w-4" />
            All Agencies
          </ClientLink>
        </div>
      </div>

      {/* Agency Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {agency.logoUrl && (
                <SafeImage
                  src={agency.logoUrl}
                  alt={agency.name}
                  width={80}
                  height={80}
                  className="rounded-lg object-contain border"
                  data-ai-hint="company logo"
                  fallbackSrc="https://placehold.co/80x80.png"
                />
              )}
              <div>
                <CardTitle className="text-2xl">{agency.name}</CardTitle>
                {agency.registeredName && agency.registeredName !== agency.name && (
                  <CardDescription className="mt-1">
                    Registered as: {agency.registeredName}
                  </CardDescription>
                )}
                <div className="mt-2">
                  <Badge variant="secondary">
                    {agencyMap.role.charAt(0).toUpperCase() + agencyMap.role.slice(1)}
                  </Badge>
                  {agencyMap.lockIn && (
                    <Badge variant="outline" className="ml-2">
                      Lock-in Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {agency.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground">{agency.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How to reach the agency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agency.contactEmail && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${agency.contactEmail}`}
                className="text-sm hover:underline text-primary"
              >
                {agency.contactEmail}
              </a>
            </div>
          )}

          {agency.contactPhone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${agency.contactPhone}`}
                className="text-sm hover:underline text-primary"
              >
                {agency.contactPhone}
              </a>
            </div>
          )}

          {agency.website && (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline text-primary"
              >
                {agency.website}
              </a>
            </div>
          )}

          {!agency.contactEmail && !agency.contactPhone && !agency.website && (
            <p className="text-sm text-muted-foreground">No contact information available.</p>
          )}
        </CardContent>
      </Card>

      {/* Locations Card */}
      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>Office locations and branches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agency.mainLocation && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Main Office</p>
                <p className="text-sm text-muted-foreground">{agency.mainLocation}</p>
              </div>
            </div>
          )}

          {agency.branches && agency.branches.length > 0 && (
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Branches ({agency.branches.length})</p>
                <ul className="mt-1 space-y-1">
                  {agency.branches.map((branch, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {branch}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!agency.mainLocation && (!agency.branches || agency.branches.length === 0) && (
            <p className="text-sm text-muted-foreground">No location information available.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your agency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ClientLink
            href={`/manage/agencies/${agency.id}/edit`}
            className={buttonVariants({ variant: 'outline', className: 'w-full justify-start' })}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Agency Profile
          </ClientLink>

          <ClientLink
            href="/manage/teams"
            className={buttonVariants({ variant: 'outline', className: 'w-full justify-start' })}
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Team Members
          </ClientLink>

          <ClientLink
            href="/manage/agencies"
            className={buttonVariants({ variant: 'outline', className: 'w-full justify-start' })}
          >
            <Building className="mr-2 h-4 w-4" />
            View All Agencies
          </ClientLink>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Agency Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agency ID:</span>
            <span className="font-mono">{agency.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Role:</span>
            <span className="capitalize">{agencyMap.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{agency.createdAt ? new Date(agency.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated:</span>
            <span>{agency.updatedAt ? new Date(agency.updatedAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
