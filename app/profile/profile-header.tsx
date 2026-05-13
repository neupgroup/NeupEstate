'use client';

import { Button } from '@/components/ui/button';
import { MapPin, Camera, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/neup-user-context';

type ProfileHeaderProps = {
  accountId: string;
  neupId?: string | null;
  displayName?: string | null;
  displayImage?: string | null;
  accountType?: string;
  verified?: boolean;
};

export function ProfileHeader({
  accountId,
  neupId,
  displayName,
  displayImage,
  accountType,
  verified,
}: ProfileHeaderProps) {
  const handleLine = neupId
    ? `@${neupId}`
    : `#${accountId}`;

  return (
    <div className="w-full bg-background pt-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-48 bg-slate-200 rounded-lg">
          <div className="w-full h-full object-cover rounded-lg absolute inset-0 z-0 bg-slate-200" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg z-10" />
          <div className="absolute bottom-4 left-4 z-20 flex items-end gap-4">
            <div className="relative h-24 w-24 md:h-32 md:w-32 border-4 border-background rounded-lg flex-shrink-0 overflow-hidden bg-secondary">
              <Avatar className="h-full w-full rounded-lg">
                <AvatarImage
                  src={displayImage ?? undefined}
                  alt={displayName ?? 'User'}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-lg text-2xl font-bold">
                  {getInitials(displayName ?? 'User')}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="pb-2">
              {handleLine && (
                <p className="text-xs font-mono text-white/70">
                  {handleLine}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold font-headline text-white shadow-sm flex items-center gap-2">
                {displayName ?? 'User'}
                {verified && (
                  <BadgeCheck className="h-6 w-6 text-primary" />
                )}
              </h1>
              {accountType && (
                <p className="text-gray-200 text-sm flex items-center gap-1 capitalize">
                  <MapPin className="h-4 w-4" />
                  {accountType} account
                </p>
              )}
            </div>
          </div>
          <Button size="sm" variant="secondary" className="absolute top-4 right-4 z-20" disabled>
            <Camera className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
