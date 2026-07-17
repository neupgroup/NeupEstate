import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClientLink } from "@/components/client-link";
import { hasPermission } from "@/services/permissions";
import { PERMISSIONS } from "@/services/permissions";
import { PropertyReviewRequests } from "@/components/manage/property-review-requests";
import { PropertyImageGrid } from "@/components/manage/property-image-grid";
import { PropertyImageDiffGrid } from "@/components/manage/property-image-diff-grid";
import { getPropertyById, getPropertyLogs, getPropertyReviewRequests } from "@/services/property-service";
import { ArrowLeft, Mail, Phone } from "lucide-react";

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

function isOwnershipField(field: string) {
  return field.toLowerCase() === "owners";
}

function isOwnerReferenceField(field: string) {
  return field.toLowerCase() === "owner";
}

function isCardField(field: string) {
  const normalized = field.toLowerCase();
  return normalized === "images" || normalized === "owners" || normalized === "owner" || normalized === "pricing" || normalized === "amenities";
}

type OwnerLogEntry = {
  key: string;
  name: string;
  email: string;
  phone: string;
  primary: boolean;
};

function isOwnerLikeRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return [
    "clientName",
    "name",
    "ownerName",
    "ownerClientName",
    "clientEmail",
    "email",
    "ownerEmail",
    "clientPhone",
    "phone",
    "ownerPhone",
    "ownerClientId",
    "id",
  ].some((key) => key in record);
}

function normalizeOwnerLogEntries(value: unknown): OwnerLogEntry[] {
  const rawEntries = Array.isArray(value)
    ? value
    : isOwnerLikeRecord(value)
      ? [value]
      : value && typeof value === "object"
        ? Object.values(value as Record<string, unknown>)
        : [];

  return rawEntries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry, index) => {
      const name = (entry.clientName ?? entry.name ?? entry.ownerName ?? entry.ownerClientName ?? entry.ownerClientId ?? "") as string | number | null | undefined;
      const email = (entry.clientEmail ?? entry.email ?? entry.ownerEmail ?? "") as string | number | null | undefined;
      const phone = (entry.clientPhone ?? entry.phone ?? entry.ownerPhone ?? "") as string | number | null | undefined;

      return {
        key: String(entry.ownerClientId ?? entry.id ?? index),
        name: typeof name === "number" ? String(name) : String(name ?? "").trim(),
        email: typeof email === "number" ? String(email) : String(email ?? "").trim(),
        phone: typeof phone === "number" ? String(phone) : String(phone ?? "").trim(),
        primary: Boolean(entry.isPrimaryOwner),
      };
    })
    .filter((entry) => entry.name.length > 0 || entry.email.length > 0 || entry.phone.length > 0);
}

function LogSectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <div className="text-lg font-bold tracking-tight text-foreground">{title}</div>
      {description ? <div className="mt-0.5 text-xs text-muted-foreground space-y-2">{description}</div> : null}
    </div>
  );
}

function renderOwnerCard(entry: OwnerLogEntry, tone: "removed" | "added", index: number) {
  const cardClasses = tone === "removed"
    ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
    : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20";

  return (
    <div key={`${tone}-${entry.key}-${index}`} className={`rounded-xl border p-4 ${cardClasses}`}>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-foreground">{entry.name || "Not set"}</div>
          {entry.primary && (
            <span className="inline-flex h-5 items-center rounded-full border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              (P)
            </span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="break-all">{entry.phone || "Not set"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="break-all">{entry.email || "Not set"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderOwnershipChange(previousValue: unknown, currentValue: unknown, approved: boolean) {
  const previousOwners = normalizeOwnerLogEntries(previousValue);
  const currentOwners = normalizeOwnerLogEntries(currentValue);
  const removedOwners = previousOwners.filter((previousOwner) => {
    return !currentOwners.some((currentOwner) =>
      currentOwner.key === previousOwner.key ||
      (currentOwner.name === previousOwner.name &&
        currentOwner.email === previousOwner.email &&
        currentOwner.phone === previousOwner.phone),
    );
  });
  const addedOwners = approved
    ? currentOwners.filter((currentOwner) => {
        return !previousOwners.some((previousOwner) =>
          previousOwner.key === currentOwner.key ||
          (previousOwner.name === currentOwner.name &&
            previousOwner.email === currentOwner.email &&
            previousOwner.phone === currentOwner.phone),
        );
      })
    : currentOwners;

  if (!removedOwners.length && !addedOwners.length) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {removedOwners.length > 0 && (
        <div className="space-y-3">
          {removedOwners.map((entry, index) => renderOwnerCard(entry, "removed", index))}
        </div>
      )}

      {addedOwners.length > 0 && (
        <div className="space-y-3">
          {addedOwners.map((entry, index) => renderOwnerCard(entry, "added", index))}
        </div>
      )}
    </div>
  );
}

type OwnerReferenceEntry = {
  id: string;
  primary: boolean;
};

function normalizeOwnerReferenceEntries(value: unknown): OwnerReferenceEntry[] {
  const rawEntries = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      ? [value]
      : [];

  return rawEntries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => {
      const id = typeof entry.id === "string"
        ? entry.id.trim()
        : typeof entry.ownerClientId === "string"
          ? entry.ownerClientId.trim()
          : "";

      return {
        id,
        primary: Boolean(entry.isprimary ?? entry.isPrimaryOwner),
      };
    })
    .filter((entry) => entry.id.length > 0);
}

function ownerReferenceValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeOwnerReferenceEntries(left)) === JSON.stringify(normalizeOwnerReferenceEntries(right));
}

function renderOwnerReferenceCard(entry: OwnerReferenceEntry, tone: "removed" | "added", index: number) {
  const cardClasses = tone === "removed"
    ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
    : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20";

  return (
    <div key={`${tone}-${entry.id}-${index}`} className={`rounded-xl border p-4 ${cardClasses}`}>
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-foreground">
          {tone === "removed" ? "Previous owner" : "New owner"}
        </div>
        {entry.primary && (
          <span className="inline-flex h-5 items-center rounded-full border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            (p)
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Owner ID</div>
          <div className="text-sm text-foreground break-all">{entry.id}</div>
        </div>
      </div>
    </div>
  );
}

function renderOwnerReferenceChange(previousValue: unknown, currentValue: unknown, approved: boolean) {
  const previousOwners = normalizeOwnerReferenceEntries(previousValue);
  const currentOwners = normalizeOwnerReferenceEntries(currentValue);
  const removedOwners = previousOwners.filter((previousOwner) => {
    return !currentOwners.some((currentOwner) => currentOwner.id === previousOwner.id);
  });
  const addedOwners = approved
    ? currentOwners.filter((currentOwner) => !previousOwners.some((previousOwner) => previousOwner.id === currentOwner.id))
    : currentOwners;

  if (!removedOwners.length && !addedOwners.length) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {removedOwners.length > 0 && (
        <div className="space-y-3">
          {removedOwners.map((entry, index) => renderOwnerReferenceCard(entry, "removed", index))}
        </div>
      )}

      {addedOwners.length > 0 && (
        <div className="space-y-3">
          {addedOwners.map((entry, index) => renderOwnerReferenceCard(entry, "added", index))}
        </div>
      )}
    </div>
  );
}

function renderTitleChange(previousValue: unknown, currentValue: unknown, approved: boolean) {
  const previousTitle = formatValue(previousValue);
  const currentTitle = approved ? formatValue(currentValue) : formatValue(previousValue);
  const previousHasValue = hasRenderableValue(previousValue);
  const currentHasValue = approved ? hasRenderableValue(currentValue) : hasRenderableValue(previousValue);
  const changeCaption = !previousHasValue && currentHasValue
    ? "The title was added."
    : previousHasValue && !currentHasValue
      ? "The title was removed."
      : "The title was changed.";

  if (!previousTitle && !currentTitle) {
    return null;
  }

  return (
    <div className="mt-4">
      <LogSectionTitle title="Title:" description={changeCaption} />
      <div className="mt-3 space-y-1">
        {approved && previousTitle !== "Not set" && (
          <div className="line-through text-sm text-muted-foreground">{previousTitle}</div>
        )}
        {currentHasValue && <div className="text-base text-foreground">{currentTitle}</div>}
      </div>
    </div>
  );
}

function renderDescriptionChange(previousValue: unknown, currentValue: unknown, approved: boolean) {
  const previousDescription = formatValue(previousValue);
  const currentDescription = approved ? formatValue(currentValue) : formatValue(previousValue);
  const currentHasValue = approved ? hasRenderableValue(currentValue) : hasRenderableValue(previousValue);

  if (!previousDescription && !currentDescription) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="mt-2.5 space-y-1 text-sm text-foreground">
        {approved && previousDescription !== "Not set" && <div className="line-through">{previousDescription}</div>}
        {currentHasValue && <div className="whitespace-pre-wrap break-words">{currentDescription}</div>}
      </div>
    </div>
  );
}

function renderSimpleFieldChange(previousValue: unknown, currentValue: unknown, approved: boolean) {
  if (!approved) {
    return <div className="mt-3 text-sm text-foreground">{formatValue(previousValue)}</div>;
  }

  return (
    <div className="mt-3 space-y-2 text-sm text-foreground">
      {hasRenderableValue(previousValue) && (
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Previous</div>
          <div>{formatValue(previousValue)}</div>
        </div>
      )}
      {hasRenderableValue(currentValue) && (
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current</div>
          <div>{formatValue(currentValue)}</div>
        </div>
      )}
    </div>
  );
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
          <div>
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
                const logTitle = formatValue(approved ? getPathValue(afterState, "title") : getPathValue(beforeState, "title"));
                const visibleChanges = changeItems.filter((item) => {
                  const previousValue = approved ? getPathValue(beforeState, item.field) : item.value;
                  const currentValue = approved ? getPathValue(afterState, item.field) : undefined;

                  if (isOwnerReferenceField(item.field)) {
                    if (!approved) {
                      return normalizeOwnerReferenceEntries(item.value).length > 0;
                    }

                    return !ownerReferenceValuesEqual(previousValue, currentValue);
                  }

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
                  <li key={log.id}>
                    <Card>
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
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Log #{log.id.slice(0, 8)}</span>
                            {' · '}
                            <span>Requested by {requestedBy} {formatRelativeTime(log.requestedOn)}</span>
                            {' · '}
                            <span>
                              {statusTone === "approved"
                                ? `Approved by ${approvedBy || "Unknown"} ${formatRelativeTime(log.approvedOn)}`
                                : statusTone === "rejected"
                                  ? `Rejected by ${approvedBy || "Unknown"} ${formatRelativeTime(log.approvedOn || log.requestedOn)}`
                                  : `Approval pending`}
                            </span>
                          </p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <Separator className="mt-4 -mx-6 w-[calc(100%+3rem)]" />

                        {visibleChanges.length > 0 ? (
                          <div className="space-y-3">
                            <div className="space-y-4">
                              {visibleChanges.map((item, index) => {
                                const previousValue = approved ? getPathValue(beforeState, item.field) : item.value;
                                const currentValue = approved ? getPathValue(afterState, item.field) : undefined;
                                const cardField = isCardField(item.field);
                                const outlinedField = cardField && item.field !== "images" && !isOwnerReferenceField(item.field) && !isOwnershipField(item.field);
                                return (
                                  <div key={`${log.id}-${item.field}`}>
                                    <div className={outlinedField ? "rounded-xl border bg-background p-4" : "space-y-1"}>
                                      {item.field === "title" ? (
                                        renderTitleChange(previousValue, currentValue, approved)
                                      ) : item.field === "description" ? (
                                        <div className="space-y-4">
                                          <LogSectionTitle
                                            title="Description:"
                                            description={
                                              !hasRenderableValue(previousValue) && hasRenderableValue(currentValue)
                                                ? "The description was added."
                                                : hasRenderableValue(previousValue) && !hasRenderableValue(currentValue)
                                                  ? "The description was removed."
                                                  : "The description was changed."
                                            }
                                          />
                                          {renderDescriptionChange(previousValue, currentValue, approved)}
                                        </div>
                                      ) : approved && isOwnerReferenceField(item.field) ? (
                                        <div className="space-y-2">
                                          <LogSectionTitle
                                            title={`${humanizeField(item.field)}:`}
                                            description="Changed in this timeline entry"
                                          />
                                          {renderOwnerReferenceChange(previousValue, currentValue, approved)}
                                        </div>
                                      ) : approved && isOwnershipField(item.field) ? (
                                        <div className="space-y-2">
                                          <LogSectionTitle
                                            title={`${humanizeField(item.field)}:`}
                                            description="Changed in this timeline entry"
                                          />
                                          {renderOwnershipChange(previousValue, currentValue, approved)}
                                        </div>
                                      ) : item.field === "images" ? (
                                        <div className="space-y-2">
                                          <LogSectionTitle
                                            title={`${humanizeField(item.field)}:`}
                                            description="Changed in this timeline entry"
                                          />
                                          {approved ? (
                                            <div className="mt-4">
                                              <PropertyImageDiffGrid items={getImageDiff(previousValue, currentValue)} />
                                            </div>
                                          ) : (
                                            <div className="mt-4">
                                              <PropertyImageGrid images={normalizeImageList(item.value)} />
                                            </div>
                                          )}
                                        </div>
                                      ) : outlinedField && approved ? (
                                        <div className="space-y-2">
                                          <LogSectionTitle
                                            title={`${humanizeField(item.field)}:`}
                                            description="Changed in this timeline entry"
                                          />
                                          <div className="mt-2.5">
                                            {item.field === "pricing" ? (
                                              <div className="space-y-2">
                                                {hasRenderableValue(previousValue) && (
                                                  <div className="space-y-1">
                                                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Previous</div>
                                                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">{formatValue(previousValue)}</div>
                                                  </div>
                                                )}
                                                {hasRenderableValue(currentValue) && (
                                                  <div className="space-y-1">
                                                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current</div>
                                                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">{formatValue(currentValue)}</div>
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="grid gap-3 lg:grid-cols-2">
                                                {hasRenderableValue(previousValue) && (
                                                  <div className="space-y-1">
                                                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Previous</div>
                                                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                                                      {formatValue(previousValue)}
                                                    </div>
                                                  </div>
                                                )}

                                                {hasRenderableValue(currentValue) && (
                                                  <div className="space-y-1">
                                                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current</div>
                                                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                                                      {formatValue(currentValue)}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : outlinedField ? (
                                        <div className="space-y-2">
                                          <LogSectionTitle
                                            title={`${humanizeField(item.field)}:`}
                                            description="Changed in this timeline entry"
                                          />
                                          <div className="mt-2.5 space-y-3">
                                            {item.field === "owner" ? (
                                              normalizeOwnerReferenceEntries(item.value).map((entry, index) => renderOwnerReferenceCard(entry, "added", index))
                                            ) : item.field === "owners" ? (
                                              normalizeOwnerLogEntries(item.value).map((entry, index) => renderOwnerCard(entry, "added", index))
                                            ) : (
                                              <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                                                {formatValue(item.value)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <LogSectionTitle
                                            title={`${humanizeField(item.field)}:`}
                                            description="Changed in this timeline entry"
                                          />
                                          {renderSimpleFieldChange(previousValue, currentValue, approved)}
                                        </div>
                                      )}
                                    </div>
                                    {index < visibleChanges.length - 1 && (
                                      <Separator className="mx-6 my-4 w-[calc(100%-3rem)]" />
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
