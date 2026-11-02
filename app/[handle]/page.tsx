import { notFound } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { Card, CardContent } from '@neup/components/ui/card';
import { Link } from '@neup/components/ui/link';
import { PropertyCard } from '@/components/property-card';
import { SafeImage } from '@/components/safe-image';
import { getAccountProfileByNeupId } from '@/services/accounts/profile';
import { getPropertiesByAccount } from '@/services/properties/list';
import { AlertCircle, Building2, MapPin, MessageSquare, Phone, UserRound, Users } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';

const AGENCY_ACCOUNT_TYPES = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'];

/** Resolve an @handle route segment into a NeupID. */
function resolveNeupId(handle: string) {
  const decodedHandle = decodeURIComponent(handle);
  if (!decodedHandle.startsWith('@')) return null;
  const neupId = decodedHandle.slice(1).trim();
  return neupId.length > 0 ? neupId : null;
}

/** Render the public user profile, agency memberships, and active listings. */
export default async function PublicAccountProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const neupId = resolveNeupId(handle);
  if (!neupId) notFound();

  const account = await getAccountProfileByNeupId(neupId);
  if (!account) notFound();

  const profile = account.profile;
  const isAgency = AGENCY_ACCOUNT_TYPES.includes(profile.type);
  const isAgent = profile.type === 'individual.agent';
  const accountProperties = await getPropertiesByAccount(profile.id, 0, 100);
  const properties = accountProperties.filter((property) => property.status === 'ACTIVE');

  return (
    <main className="flex-1">
      <section className="bg-background">
        <div className="container mx-auto grid gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-5">
              <SafeImage
                src={profile.image || 'https://placehold.co/160x160.png'}
                alt={`${profile.name} profile`}
                width={96}
                height={96}
                className="h-20 w-20 rounded-2xl border border-border bg-card object-cover shadow-sm sm:h-24 sm:w-24"
                fallbackSrc="https://placehold.co/160x160.png"
              />
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary">
                  {isAgency ? <Building2 className="h-4 w-4" /> : isAgent ? <Users className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                  {isAgency ? 'Real estate agency' : isAgent ? 'Real estate agent' : 'Neup.Estate member'}
                </p>
                <p className="text-sm text-muted-foreground">@{profile.neupid}</p>
              </div>
            </div>
            <h1 className="mt-7 text-4xl font-headline font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
            {profile.bio ? (
              <p className="mt-5 max-w-xl whitespace-pre-line text-lg leading-8 text-muted-foreground">{profile.bio}</p>
            ) : (
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                {isAgent
                  ? 'Connect with this real estate agent and explore their available properties.'
                  : isAgency
                    ? 'Explore this agency’s team and properties.'
                    : 'Explore properties represented by this Neup.Estate member.'}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {account.contact.email ? (
                <a
                  href={`mailto:${account.contact.email}`}
                  aria-label={`Message ${profile.name}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <MessageSquare aria-hidden="true" className="h-4 w-4" />
                  Message now
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={`Message ${profile.name}; no email address available`}
                  className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground opacity-60"
                >
                  <MessageSquare aria-hidden="true" className="h-4 w-4" />
                  Message now
                </button>
              )}
              {account.contact.phone ? (
                <a
                  href={`tel:${account.contact.phone}`}
                  aria-label={`Call ${profile.name}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-medium text-card-foreground transition-colors hover:bg-muted"
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  Call now
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={`Call ${profile.name}; no phone number available`}
                  className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-medium text-muted-foreground opacity-60"
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  Call now
                </button>
              )}
              {account.contact.phone ? (
                  <a
                    href={`https://wa.me/${account.contact.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${profile.name}`}
                    title="WhatsApp"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-card-foreground transition-colors hover:bg-muted"
                  >
                    <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
                  </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-label={`WhatsApp ${profile.name}; no phone number available`}
                  title="WhatsApp unavailable"
                  className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-60"
                >
                  <WhatsAppIcon aria-hidden="true" className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-3xl border border-primary/10 bg-muted shadow-lg sm:min-h-[410px]">
            <SafeImage
              src={profile.cover || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85'}
              alt={`Property cover for ${profile.name}`}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              fallbackSrc="https://placehold.co/1200x900.png"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-sm font-medium text-white/80">Neup.Estate public profile</p>
              <p className="mt-2 text-2xl font-semibold sm:text-3xl">A profile for people and property.</p>
            </div>
          </div>
        </div>
      </section>

      {isAgent && account.agencies.length > 0 && (
        <section aria-labelledby="agency-membership-heading" className="border-y border-border/60 bg-card px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 id="agency-membership-heading" className="text-2xl font-headline font-bold">Agency affiliation</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {account.agencies.map((agency) => (
                <Card key={agency.id} className="bg-background text-card-foreground">
                  <CardContent className="flex items-center gap-4 p-4">
                    <SafeImage src={agency.image || 'https://placehold.co/96x96.png'} alt={`${agency.name} logo`} width={56} height={56} className="h-14 w-14 rounded-lg border bg-white p-1 object-contain" fallbackSrc="https://placehold.co/96x96.png" />
                    <div className="min-w-0">
                      {agency.neupid ? (
                        <Link href={`/@${encodeURIComponent(agency.neupid)}`} className="font-semibold hover:underline">{agency.name}</Link>
                      ) : (
                        <p className="font-semibold">{agency.name}</p>
                      )}
                      {agency.isPrimary && <p className="mt-1 text-sm text-muted-foreground">Primary agency</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="profile-properties" className="bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="container mx-auto">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-headline font-bold">Properties</h2>
              <p className="mt-2 text-muted-foreground">Active properties represented by {profile.name}.</p>
            </div>
            <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:inline-flex">
              <MapPin className="h-4 w-4 text-primary" /> @{profile.neupid}
            </span>
          </div>
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Properties Found</AlertTitle>
              <AlertDescription>This profile does not have any active properties yet.</AlertDescription>
            </Alert>
          )}
        </div>
      </section>
    </main>
  );
}
