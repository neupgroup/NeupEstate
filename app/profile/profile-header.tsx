import { Button } from '@/components/ui/button';
import { Camera, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAccountDisplayName, getAccountHandle } from '@/logica/core/account-display';
type ProfileHeaderProps = {
  displayName: string;
  displayImage: string | null;
  neupId: string | null;
  verified: boolean;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export function ProfileHeader({
  displayName,
  displayImage,
  neupId,
  verified,
}: ProfileHeaderProps) {
  const resolvedName = getAccountDisplayName(displayName);
  const handleLine = getAccountHandle(neupId);

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
                  alt={resolvedName}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-lg text-2xl font-bold">
                  {getInitials(resolvedName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="pb-2">
              <h1 className="text-3xl md:text-4xl font-bold font-headline text-white shadow-sm flex items-center gap-2 leading-tight">
                {resolvedName}
                {verified && (
                  <BadgeCheck className="h-6 w-6 text-primary" />
                )}
              </h1>
              <p className="mt-1 text-xs md:text-sm font-mono text-white/75">
                {handleLine}
              </p>
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
