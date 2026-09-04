import { Link } from "#/components/ui/link";
import { LinkButton } from "#/components/ui/link-button";
import { ArrowRight, ChevronRight } from "lucide-react";

export const SectionTitle = ({ children, href, showMoreButton = false }: { children: React.ReactNode, href?: string, showMoreButton?: boolean }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
        {href && showMoreButton ? (
             <Link href={href} basePath={true}>
                <h2 className="text-3xl font-headline font-bold text-gray-800 hover:underline">{children}</h2>
             </Link>
        ) : (
            <h2 className="text-3xl font-headline font-bold text-gray-800">{children}</h2>
        )}
    </div>
    {href && showMoreButton && (
       <LinkButton href={href} basePath={true} variant="outlined" size="icon">
          <ChevronRight className="h-5 w-5" />
       </LinkButton>
    )}
  </div>
);
