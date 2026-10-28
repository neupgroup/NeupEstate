import { Link } from '@neup/components/ui/link';

const NEUPID_MENTION = /@([A-Za-z0-9][A-Za-z0-9._-]*)/g;

/** Render @neupid handles in profile About text as links to the matching agent profile. */
export function NeupidMentions({ text }: { text: string }) {
  return text.split(NEUPID_MENTION).map((part, index) => {
    if (index % 2 === 0) return part;
    return (
      <Link key={`${part}-${index}`} href={`/agents/${encodeURIComponent(part)}`} className="font-medium text-primary hover:underline">
        @{part}
      </Link>
    );
  });
}
