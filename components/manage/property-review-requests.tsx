"use client";

import * as React from "react";
import { reviewPropertyChangeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/logica/core/hooks/use-toast";

type ReviewRequest = {
  id: string;
  propertyId: string;
  accountId: string;
  status: string;
  data: Record<string, any>;
  modifiedOn: string;
  account?: { displayName?: string | null; neupId?: string | null } | null;
};

export function PropertyReviewRequests({ propertyId, requests }: { propertyId: string; requests: ReviewRequest[] }) {
  const { toast } = useToast();
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
          : request.status === "creating"
            ? "border-blue-200 bg-blue-50 text-blue-950"
            : "border-slate-200 bg-slate-50 text-slate-950";

        return (
          <div key={request.id} className={`rounded-xl border px-4 py-4 ${toneClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold">
                  {request.status === "deleting" ? "Deletion request" : request.status === "creating" ? "Creation request" : "Change request"}
                </div>
                <div className="text-xs text-current/70">
                  Submitted by {request.account?.displayName || request.account?.neupId || request.accountId} on {new Date(request.modifiedOn).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" onClick={() => approve(request)}>Approve</Button>
                <Button type="button" variant="outline" onClick={() => reject(request)}>Disapprove</Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {fields.length ? fields.map((field) => {
                const checked = selected.includes(field);
                return (
                  <label key={field} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
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
                    <span>{field}</span>
                  </label>
                );
              }) : <div className="text-sm text-current/70">No structured fields found.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
