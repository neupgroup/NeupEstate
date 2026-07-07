
/*
::neup.documentation::home-section-wrapper

Shared homepage section wrapper that provides consistent spacing and container width.

::end
*/

import { cn } from "@/logica/core/utils";

export const Section = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <section className={cn("w-full py-12 transition-colors duration-300", className)}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
);
