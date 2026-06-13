import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClientLink } from "@/components/client-link";
import { hasPermission } from "@/logica/auth/authorization";
import { PERMISSIONS } from "@/logica/auth/permissions";
import { PropertyReviewRequests } from "@/components/manage/property-review-requests";
import { PropertyImageGrid } from "@/components/manage/property-image-grid";
import { PropertyImageDiffGrid } from "@/components/manage/property-image-diff-grid";
import { getPropertyById, getPropertyLogs, getPropertyReviewRequests } from "@/services/property-service";
import { ArrowLeft, UserRound } from "lucide-react";

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

function formatRelativeTime(value: string | null) {
  if (!value) return "pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "pending";

  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  const unit = units.find(([, size]) => absSeconds >= size) ?? ["second", 1];
  const valueInUnit = Math.round(diffSeconds / unit[1]);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(valueInUnit, unit[0]);
}

function resolveAccountLabel(account: { displayName: string | null; neupId: string | null; id: string } | null, fallback: string) {
  if (!account) return fallback;
  return account.displayName?.trim() || account.neupId?.trim() || account.id || fallback;
}

function getPathValue(source: unknown, path: string): unknown {
  if (!source || !path) return undefined;
  return path.split(".").reduce((current: any, key) => (current == null ? undefined : current[key]), source as any);
}

function isImageField(field: string) {
  return field.toLowerCase() === "images";
}

function getLogTitle(log: { data: Array<{ field?: string | null; value?: unknown }> }, fallback: string) {
  const titleEntry = log.data.find((entry) => String(entry?.field ?? "").toLowerCase() === "title");
  const title = titleEntry?.value;

  if (typeof title === "string" && title.trim().length > 0) return title.trim();
  if (typeof title === "number") return String(title);
  return fallback;
}

function getLogStatusTone(log: { approvedOn: string | null; approvedBy: string | null }) {
  if (log.approvedOn) return "approved";
  if (log.approvedBy && !log.approvedOn) return "rejected";
  return "pending";
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setPathValue(target: Record<string, any>, path: string, value: unknown) {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return;

  let cursor: Record<string, any> = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const next = cursor[key];

    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[key] = {};
    }

    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
}

function applyLogData(base: Record<string, any>, data: Array<{ field?: string | null; value?: unknown }>) {
  const next = cloneState(base);
  for (const entry of data) {
    const field = String(entry?.field ?? "").trim();
    if (!field) continue;
    setPathValue(next, field, entry?.value);
  }
  return next;
}

function normalizeImageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function getImageDiff(before: unknown, after: unknown) {
  const previousImages = normalizeImageList(before);
  const currentImages = normalizeImageList(after);
  const currentSet = new Set(currentImages);
  const previousSet = new Set(previousImages);

  const removed = previousImages
    .filter((src) => !currentSet.has(src))
    .map((src) => ({ src, status: "removed" as const }));

  const added = currentImages
    .filter((src) => !previousSet.has(src))
    .map((src) => ({ src, status: "added" as const }));

  return [...removed, ...added];
}

function hasRenderableValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some((entry) => hasRenderableValue(entry));
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some((entry) => hasRenderableValue(entry));
  return true;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default async function PropertyLogsPage({ params }: PageProps) {
  const { id } = await params;
  const canViewLogs = await hasPermission(PERMISSIONS.root.propertyLog);
  if (!canViewLogs) notFound();
  const canApproveProperty = await hasPermission(PERMISSIONS.manage.propertyReviewApprove);

  const property = await getPropertyById(id, { includeInactive: true });
  if (!property) notFound();

  const logs = await getPropertyLogs(id);
  const reviewRequests = canApproveProperty ? await getPropertyReviewRequests(property.id) : [];
  const timelineEntries = (() => {
    let state: Record<string, any> = {};

    return [...logs].reverse().map((log) => {
      const beforeState = cloneState(state);
      const requestedState = applyLogData(beforeState, log.data);
      const approved = Boolean(log.approvedOn);
      const afterState = approved ? requestedState : beforeState;

      if (approved) {
        state = afterState;
      }

      return {
        log,
        beforeState,
        afterState,
        approved,
      };
    }).reverse();
  })();

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

      <div className="space-y-6">
        {canApproveProperty && reviewRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Requests</CardTitle>
              <CardDescription>
                Approve or reject pending property changes from this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyReviewRequests
                propertyId={property.id}
                requests={reviewRequests}
                canApprove={canApproveProperty}
                currentProperty={property}
              />
            </CardContent>
          </Card>
        )}

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
              {timelineEntries.map(({ log, beforeState, afterState, approved }) => {
                const changeItems = log.data
                  .map((entry) => ({
                    field: String(entry?.field ?? "field"),
                    value: entry?.value,
                  }))
                  .filter((entry) => entry.field.trim().length > 0);

                const requestedBy = resolveAccountLabel(log.requestedByAccount, log.requestedBy);
                const approvedBy = log.approvedBy ? resolveAccountLabel(log.approvedByAccount, log.approvedBy) : null;
                const statusTone = getLogStatusTone(log);
                const logTitle = getLogTitle(log, property.title);
                const visibleChanges = changeItems.filter((item) => {
                  const previousValue = approved ? getPathValue(beforeState, item.field) : item.value;
                  const currentValue = approved ? getPathValue(afterState, item.field) : undefined;

                  if (!approved) {
                    return hasRenderableValue(item.value);
                  }

                  if (isImageField(item.field)) {
                    return getImageDiff(previousValue, currentValue).length > 0;
                  }

                  const previousHasValue = hasRenderableValue(previousValue);
                  const currentHasValue = hasRenderableValue(currentValue);

                  if (!previousHasValue && !currentHasValue) return false;
                  if (previousHasValue && currentHasValue && valuesEqual(previousValue, currentValue)) return false;
                  return true;
                });

                return (
                  <li key={log.id} className="relative">
                    <div className="absolute left-3 top-6 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background">
                      <div
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          statusTone === "approved"
                            ? "bg-emerald-500"
                            : statusTone === "rejected"
                              ? "bg-red-500"
                              : "bg-slate-400",
                        ].join(" ")}
                      />
                    </div>

                    <Card className="ml-6">
                      <CardHeader className="pb-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
                                statusTone === "approved"
                                  ? "bg-emerald-500"
                                  : statusTone === "rejected"
                                    ? "bg-red-500"
                                    : "bg-slate-400",
                              ].join(" ")}
                            />
                            <div className="text-base font-semibold tracking-tight text-foreground">
                              {logTitle}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Log #{log.id.slice(0, 8)}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>
                              Requested by {requestedBy} {formatRelativeTime(log.requestedOn)}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span>
                              {statusTone === "approved"
                                ? `Approved by ${approvedBy || "Unknown"} ${formatRelativeTime(log.approvedOn)}`
                                : statusTone === "rejected"
                                  ? `Rejected by ${approvedBy || "Unknown"} ${formatRelativeTime(log.approvedOn || log.requestedOn)}`
                                  : `Approval pending`}
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <Separator />

                        {visibleChanges.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <UserRound className="h-4 w-4 text-muted-foreground" />
                              Field changes
                            </div>

                            <div className="space-y-4">
                              {visibleChanges.map((item) => {
                                const previousValue = approved ? getPathValue(beforeState, item.field) : item.value;
                                const currentValue = approved ? getPathValue(afterState, item.field) : undefined;
                                return (
                                  <div key={`${log.id}-${item.field}`} className="rounded-xl border bg-background p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-semibold text-foreground">{humanizeField(item.field)}</div>
                                        <div className="text-xs text-muted-foreground">Changed in this timeline entry</div>
                                      </div>
                                    </div>

                                    {approved ? isImageField(item.field) ? (
                                      <div className="mt-4">
                                        <PropertyImageDiffGrid items={getImageDiff(previousValue, currentValue)} />
                                      </div>
                                    ) : (
                                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                        {hasRenderableValue(previousValue) && (
                                          <div className="rounded-lg border bg-muted/20 p-3">
                                            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">-</span>
                                              Previous
                                            </div>
                                            <div className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                                              {formatValue(previousValue)}
                                            </div>
                                          </div>
                                        )}

                                        {hasRenderableValue(currentValue) && (
                                          <div className="rounded-lg border bg-background p-3">
                                            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">+</span>
                                              Current
                                            </div>
                                            <div className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                                              {formatValue(currentValue)}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                                        {isImageField(item.field) ? (
                                          <div className="mt-2">
                                            <PropertyImageGrid images={normalizeImageList(item.value)} />
                                          </div>
                                        ) : (
                                          <div className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                                            {formatValue(item.value)}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            No field data was recorded for this log entry.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
