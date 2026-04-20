export default function DocumentsPage() {
  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold">Documents</h1>
          <p className="mt-2 text-muted-foreground">
            Find important forms, guides, and reference materials.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-semibold">Coming soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We are organizing downloadable resources for buyers, sellers, and agents.
          </p>
        </div>
      </div>
    </main>
  );
}
