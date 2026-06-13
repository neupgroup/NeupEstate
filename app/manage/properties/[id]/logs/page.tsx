import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClientLink } from "@/components/client-link";
import { getPropertyById, getPropertyLogs } from "@/services/property-service";
import { ArrowLeft, BadgeCheck, Clock3, PencilLine, UserRound } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

function humanizeField(field: string) {
  return field
    .split(".")
    .filter(Boolean)
    .pop()
    ?.replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || field;
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (!value.length) return "None";
    return value.map((entry) => formatValue(entry)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function resolveAccountLabel(account: { displayName: string | null; neupId: string | null; id: string } | null, fallback: string) {
  if (!account) return fallback;
  return account.displayName?.trim() || account.neupId?.trim() || account.id || fallback;
}

export default async function PropertyLogsPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getPropertyById(id, { includeInactive: true });
  if (!property) notFound();

  const logs = await getPropertyLogs(id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <ClientLink href={`/manage/properties/${property.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to property
          </ClientLink>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Property Timeline</h1>
            <p className="text-sm text-muted-foreground">
              Edit requests and approvals for <span className="font-medium text-foreground">{property.title}</span>.
            </p>
          </div>
        </div>

        <Button asChild variant="outline">
          <ClientLink href={`/manage/properties/${property.id}`}>
            View property
          </ClientLink>
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No timeline entries</CardTitle>
            <CardDescription>
              This property has not had any logged edits or approvals yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
          <ul className="space-y-5">
            {logs.map((log) => {
              const changeItems = log.data
                .map((entry) => ({
                  field: String(entry?.field ?? "field"),
                  value: entry?.value,
                }))
                .filter((entry) => entry.field.trim().length > 0);

              const requestedBy = resolveAccountLabel(log.requestedByAccount, log.requestedBy);
              const approvedBy = log.approvedBy ? resolveAccountLabel(log.approvedByAccount, log.approvedBy) : null;
              const isApproved = Boolean(log.approvedOn);

              return (
                <li key={log.id} className="relative">
                  <div className="absolute left-3 top-6 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background">
                    <div className={["h-2.5 w-2.5 rounded-full", isApproved ? "bg-emerald-500" : "bg-amber-500"].join(" ")} />
                  </div>

                  <Card className="ml-6">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={isApproved ? "default" : "secondary"} className={isApproved ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                            {isApproved ? "Approved" : "Pending approval"}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <PencilLine className="h-3.5 w-3.5" />
                            Edited
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Log #{log.id.slice(0, 8)}
                        </div>
                      </div>

                      <CardTitle className="text-base">Changes saved in this entry</CardTitle>
                      <CardDescription>
                        Each row records the field values written for this update.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            Edited on
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">{formatDateTime(log.requestedOn)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            By {requestedBy}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Approved on
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">{formatDateTime(log.approvedOn)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            By {approvedBy || "Pending approval"}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          Field values
                        </div>

                        {changeItems.length > 0 ? (
                          <div className="grid gap-3 lg:grid-cols-2">
                            {changeItems.map((item) => (
                              <div key={`${log.id}-${item.field}`} className="rounded-lg border bg-background p-3">
                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {humanizeField(item.field)}
                                </div>
                                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm text-foreground">
                                  {formatValue(item.value)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            No field data was recorded for this log entry.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
