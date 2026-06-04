import { ClientLink } from "@/components/estate";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/logica/core/utils";
import { ArrowRight, ChevronRight } from "lucide-react";

export const SectionTitle = ({ children, href, showMoreButton = false }: { children: React.ReactNode, href?: string, showMoreButton?: boolean }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
        {href && showMoreButton ? (
             <ClientLink href={href}>
                <h2 className="text-3xl font-headline font-bold text-gray-800 hover:underline">{children}</h2>
             </ClientLink>
        ) : (
            <h2 className="text-3xl font-headline font-bold text-gray-800">{children}</h2>
        )}
    </div>
    {href && showMoreButton && (
       <ClientLink href={href} className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}>
          <ChevronRight className="h-5 w-5" />
       </ClientLink>
    )}
  </div>
);
