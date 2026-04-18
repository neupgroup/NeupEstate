
import { cn } from "@/lib/utils";

export const Section = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <section className={cn("w-full py-12", className)}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
);
