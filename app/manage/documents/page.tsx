export default function ManageDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Documents
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage internal templates, contracts, and customer-facing files.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h3 className="text-lg font-semibold">Nothing here yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload and organize documents for your team from this page.
        </p>
      </div>
    </div>
  );
}
