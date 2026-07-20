import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_15%_20%,hsl(var(--accent))_0%,transparent_60%)] opacity-25" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,hsl(var(--secondary))_0%,hsl(var(--background))_50%)]" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              404
            </p>
            <h1 className="mt-4 text-4xl sm:text-5xl font-semibold">
              This page moved or never existed.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The address might be mistyped, or the listing has been archived.
              Try a fresh search or return home.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/properties">Browse properties</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href="/search">
                Search listings
              </Link>
              <Link className="hover:text-foreground" href="/agents">
                Meet agents
              </Link>
              <Link className="hover:text-foreground" href="https://neupgroup.com/sites/contact">
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
