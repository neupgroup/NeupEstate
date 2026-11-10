import { LinkButton } from "@neup/components/ui/link-button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_15%_20%,hsl(var(--accent))_0%,transparent_60%)] opacity-25" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,hsl(var(--secondary))_0%,hsl(var(--background))_50%)]" />
        <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-left">
            <svg
              aria-hidden="true"
              className="h-48 w-56 text-primary sm:h-56 sm:w-64"
              viewBox="0 0 256 224"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M22 185.5 72 169l55 17 58-19 49 15.5-50 20-57-17-55 17-50-17Z" fill="currentColor" opacity=".1" />
              <path d="m42 55 43-16 42 14 44-16 43 15v93l-43-15-44 16-42-14-43 16V55Z" className="fill-background" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
              <path d="M85 39v93m42-79v93m44-109v93" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" opacity=".55" />
              <path d="m54 108 15-18 14 8 14-21 16 7 14-15 14 9 14-18 17 8 16-21 17 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
              <circle cx="169" cy="86" r="7" fill="currentColor" />
              <path d="M144 161c0-11 9-20 20-20s20 9 20 20v5h-40v-5Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="3" />
              <circle cx="164" cy="129" r="12" className="fill-background" stroke="currentColor" strokeWidth="3" />
              <path d="m146 167-9 28m43-28 12 25m-29-25v29m-12 0h26" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              <path d="m131 151-14 7 15 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m210 36 3-9m12 17 9-4m-18 13 8 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".65" />
            </svg>
            <p className="mt-8 text-xs font-semibold uppercase tracking-normal text-primary">
              404 Page not found.
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
              Looks like you took a wrong turn.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              The address might be mistyped, or the listing has been archived.
              Try a fresh search or return home.
            </p>
            <div className="mt-8 flex flex-col justify-start gap-3 sm:flex-row">
              <LinkButton href="/home" variant="solid" preIcon={<Home />}>Back to home</LinkButton>
              <LinkButton href="/listings" variant="outlined" preIcon={<Search />}>Browse listings</LinkButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
