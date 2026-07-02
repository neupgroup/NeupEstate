"use client";

import * as React from "react";
import { reviewPropertyChangeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/logica/core/hooks/use-toast";
import type { Property } from "@/types";
import { PropertyImageGrid } from "@/components/manage/property-image-grid";
import { useRouter } from "next/navigation";

type ReviewRequest = {
  id: string;
  propertyId?: string;
  accountId: string;
  status: string;
  data: Record<string, any>;
  modifiedOn: string;
  account?: { displayName?: string | null; neupId?: string | null } | null;
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

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPathValue(source: unknown, path: string): unknown {
  if (!source || !path) return undefined;
  return path.split(".").reduce((current: any, key) => (current == null ? undefined : current[key]), source as any);
}

function formatScalarValue(value: unknown): string {
  if (value == null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (!value.length) return "None";
    return value.map((entry) => formatScalarValue(entry)).join(", ");
  }
  if (isPlainObject(value)) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function PropertyReviewRequests({
  propertyId,
  requests,
  canApprove = false,
  currentProperty,
}: {
  propertyId: string;
  requests: ReviewRequest[];
  canApprove?: boolean;
  currentProperty?: Property | null;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [selection, setSelection] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    const next: Record<string, string[]> = {};
    for (const request of requests) {
      next[request.id] = Object.keys(request.data ?? {});
    }
    setSelection(next);
  }, [requests]);

  async function approve(request: ReviewRequest) {
    const acceptedFields = selection[request.id] ?? Object.keys(request.data ?? {});
    const result = await reviewPropertyChangeAction({
      changeId: request.id,
      propertyId,
      approve: true,
      acceptedFields,
    });
    if (!result.success) {
      toast({ variant: "destructive", title: "Review failed", description: result.error ?? "Could not approve request." });
    } else {
      toast({ title: "Request approved" });
      if (request.status === "deleting") {
        router.push("/manage/properties");
        return;
      }
      window.location.reload();
    }
  }

  async function reject(request: ReviewRequest) {
    const result = await reviewPropertyChangeAction({
      changeId: request.id,
      propertyId,
      approve: false,
    });
    if (!result.success) {
      toast({ variant: "destructive", title: "Review failed", description: result.error ?? "Could not reject request." });
    } else {
      toast({ title: "Request rejected" });
      window.location.reload();
    }
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const fields = Object.keys(request.data ?? {});
        const selected = selection[request.id] ?? fields;
        const toneClass = request.status === "deleting"
          ? "border-red-200 bg-red-50 text-red-950"
          : request.status === "creation_pending" || request.status === "creating"
            ? "border-blue-200 bg-blue-50 text-blue-950"
            : "border-slate-200 bg-slate-50 text-slate-950";

        return (
          <div key={request.id} className={`rounded-xl border px-4 py-4 ${toneClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {request.status === "deleting" ? "Deletion request" : request.status === "creation_pending" || request.status === "creating" ? "Creation request" : "Change request"}
                </div>
                <div className="text-xs text-current/70">
                  Submitted by {request.account?.displayName || request.account?.neupId || request.accountId} on {new Date(request.modifiedOn).toLocaleString()}
                </div>
              </div>
              {canApprove && (
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => approve(request)}>Approve</Button>
                  <Button type="button" variant="outline" onClick={() => reject(request)}>Disapprove</Button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {fields.length ? fields.map((field) => {
                const checked = selected.includes(field);
                const nextValue = request.data?.[field];
                const previousValue = field === "images"
                  ? normalizeImages(currentProperty?.images)
                  : getPathValue(currentProperty, field);
                const previousImages = field === "images" ? normalizeImages(previousValue) : [];
                const nextImages = field === "images" ? normalizeImages(nextValue) : [];
                const isImageField = field === "images";
                return (
                  <div key={field} className="rounded-xl border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{humanizeField(field)}</div>
                        <div className="text-xs text-muted-foreground">Field included in this request</div>
                      </div>
                      <label className="flex items-center gap-2 rounded-full border bg-muted/20 px-3 py-1.5 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setSelection((current) => {
                              const prev = current[request.id] ?? fields;
                              const next = value
                                ? Array.from(new Set([...prev, field]))
                                : prev.filter((item) => item !== field);
                              return { ...current, [request.id]: next };
                            });
                          }}
                        />
                        <span>Approve field</span>
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Previous</div>
                        {isImageField ? (
                          <div className="mt-2">
                            <PropertyImageGrid images={previousImages} label="Old images" />
                          </div>
                        ) : (
                          <div className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                            {formatScalarValue(previousValue)}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border bg-background p-3">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">New</div>
                        {isImageField ? (
                          <div className="mt-2">
                            <PropertyImageGrid images={nextImages} label="New images" />
                          </div>
                        ) : (
                          <div className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                            {formatScalarValue(nextValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : <div className="text-sm text-current/70">No structured fields found.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
