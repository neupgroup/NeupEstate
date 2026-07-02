import Link from "next/link";

import { FooterLayoutV1 } from "@/components/layout/FooterLayout.v1";
import { Button } from "@/components/ui/button";

/*
::neup.documentation::manage-not-found-page

::private

Renders the manage-route 404 state with the public footer appended. The root
provider suppresses the footer on `/manage` routes, so this page adds it back
explicitly for missing admin pages.

::private end
::end
*/
export default function ManageNotFound() {
  return (
    <>
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
                This manage page moved or never existed.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                The address might be mistyped, or the resource is no longer available.
                Return to the property dashboard or go back home.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="/manage/properties">Back to properties</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FooterLayoutV1 showManagePanelLink />
    </>
  );
}
