import { Link } from "#/components/ui/link";
import { LinkButton } from "#/components/ui/link-button";
import { Compass, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_15%_20%,hsl(var(--accent))_0%,transparent_60%)] opacity-25" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,hsl(var(--secondary))_0%,hsl(var(--background))_50%)]" />
        <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Compass className="h-8 w-8" />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.4em] text-primary">
              404
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
              Looks like you took a wrong turn.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The address might be mistyped, or the listing has been archived.
              Try a fresh search or return home.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/" variant="solid" preIcon={<Home />}>Back to home</LinkButton>
              <LinkButton href="/properties" variant="outlined" preIcon={<Search />}>Browse properties</LinkButton>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
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
