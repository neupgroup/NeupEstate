import { notFound } from 'next/navigation';
import { Card, CardContent } from '@neup/components/ui/card';
import { Link } from '@neup/components/ui/link';
import { ListingCard } from '@/components/property-card';
import { SafeImage } from '@/components/safe-image';
import { getAccountProfileByNeupId } from '@/services/accounts/profile';
import { getListingsByAccount } from '@/services/listings/list';
import { getRequirementByUserId } from '@/services/requirements/get';
import { getAgencyAgentAccountsByAgency } from '@/services/agencies/agent-maps/service';
import { Building2, MessageSquare, Phone, UserRound, Users } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';

const AGENCY_ACCOUNT_TYPES = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'];

/** Extract the NeupID from the @prefixed dynamic route segment. */
function resolveNeupId(routeNeupId: string) {
  const decodedRouteNeupId = decodeURIComponent(routeNeupId);
  if (!decodedRouteNeupId.startsWith('@')) return null;
  const neupId = decodedRouteNeupId.slice(1).trim();
  return neupId || null;
}

/** Render the public user profile, agency memberships, and active listings. */
export default async function PublicAccountProfilePage({
  params,
}: {
  params: Promise<{ neupid: string }>;
}) {
  const { neupid: routeNeupId } = await params;
  const neupId = resolveNeupId(routeNeupId);
  if (!neupId) notFound();

  const account = await getAccountProfileByNeupId(neupId);
  if (!account) notFound();

  const profile = account.profile;
  const isAgency = AGENCY_ACCOUNT_TYPES.includes(profile.type);
  const isAgent = profile.type === 'individual.agent';
  const [accountListings, accountRequirements, agencyAgents] = await Promise.all([
    getListingsByAccount(profile.id, 0, 100),
    getRequirementByUserId(profile.id),
    isAgency ? getAgencyAgentAccountsByAgency(profile.id) : Promise.resolve([]),
  ]);
  const listings = accountListings.filter((property) => property.status === 'ACTIVE');
  const requirements = accountRequirements ?? [];

  return (
    <main className="flex-1">
      <section className="bg-background">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-14 sm:px-6 md:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-20">
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

      {requirements.length > 0 && (
        <section aria-labelledby="profile-requirements-heading" className="bg-card py-12 lg:py-16">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="profile-requirements-heading" className="text-3xl font-headline font-bold">Listing requirements</h2>
                <p className="mt-2 text-muted-foreground">Listing preferences shared by {profile.name}.</p>
              </div>
              <Link href={`/@${encodeURIComponent(neupId)}/requirements`} className="font-medium text-primary hover:underline">View all requirements</Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {requirements.slice(0, 3).map((requirement, index) => (
                <Card key={requirement.id} className="bg-background text-card-foreground">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground">Requirement {index + 1}</p>
                    <p className="mt-2 text-xl font-semibold capitalize">{requirement.purpose || 'Property search'}</p>
                    <dl className="mt-5 space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Listing type</dt><dd className="text-right">{requirement.propertyType?.join(', ') || 'Any'}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Area</dt><dd className="text-right">{requirement.location || 'Any'}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Budget</dt><dd className="text-right">{requirement.minBudget?.toLocaleString() || 'Any'} – {requirement.maxBudget?.toLocaleString() || 'Any'}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Timeline</dt><dd className="text-right">{requirement.requiredTime || 'Flexible'}</dd></div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {isAgent && account.agencies.length > 0 && (
        <section aria-labelledby="agency-membership-heading" className="border-y border-border/60 bg-card py-10">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8">
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

      {isAgency && agencyAgents.length > 0 && (
        <section aria-labelledby="agency-agents-heading" className="border-y border-border/60 bg-card py-12 lg:py-16">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="agency-agents-heading" className="text-3xl font-headline font-bold">Our Agents</h2>
                <p className="mt-2 text-muted-foreground">Meet the agents on the {profile.name} team.</p>
              </div>
              <Link href={`/@${encodeURIComponent(neupId)}/agents`} className="font-medium text-primary hover:underline">View all agents</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {agencyAgents.slice(0, 4).map((agent) => {
                const displayName = agent.display_name?.trim() || agent.neup_id?.trim() || agent.id;
                const agentHref = agent.neup_id?.trim() ? `/@${encodeURIComponent(agent.neup_id.trim())}` : null;
                return (
                  <Card key={agent.id} className="bg-background text-card-foreground">
                    <CardContent className="flex items-center gap-4 p-4">
                      <SafeImage src={agent.display_image || 'https://placehold.co/96x96.png'} alt={`${displayName} profile`} width={56} height={56} className="h-14 w-14 rounded-full border bg-white object-cover" fallbackSrc="https://placehold.co/96x96.png" />
                      <div className="min-w-0">
                        {agentHref ? <Link href={agentHref} className="font-semibold hover:underline">{displayName}</Link> : <p className="font-semibold">{displayName}</p>}
                        <p className="mt-1 text-sm text-muted-foreground">Real estate agent</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {listings.length > 0 && (
        <section id="profile-properties" className="bg-muted/20 py-12 lg:py-16">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-headline font-bold">Listings</h2>
                <p className="mt-2 text-muted-foreground">Active listings represented by {profile.name}.</p>
              </div>
              <Link href={`/@${encodeURIComponent(neupId)}/listings`} className="font-medium text-primary hover:underline">View all listings</Link>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.slice(0, 8).map((property) => <ListingCard key={property.id} property={property} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
