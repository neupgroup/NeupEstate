"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";

import { savePropertyChangeDraftAction } from '@/services/property/drafts';
import { ClientLink } from "@/components/client-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/core/hooks/use-toast";

type ListingAgentOption = {
  id: string;
  name: string;
  imageUrl: string | null;
  agencyId: string | null;
  agencyName: string | null;
};

type AgencyOption = {
  id: string;
  name: string;
};

type PropertyTransferFormProps = {
  propertyId: string;
  currentAgencyId: string | null;
  currentAgentId: string | null;
  agencyOptions: AgencyOption[];
  agentOptions: ListingAgentOption[];
};

const NONE_VALUE = "__none__";
const OWNER_VALUE = "__owner__";

function normalizeId(value: string | null | undefined) {
  if (!value || value === NONE_VALUE || value === OWNER_VALUE) return null;
  return value.trim() || null;
}

/*
::neup.documentation::manage-property-transfer-form

::private

Client form for `/manage/properties/[id]/transfer`. It changes listing
responsibility by saving only the `agency` and `listingAgentAccountId` fields as
a pending property-change request.

::private end
::end
*/
export function PropertyTransferForm({
  propertyId,
  currentAgencyId,
  currentAgentId,
  agencyOptions,
  agentOptions,
}: PropertyTransferFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState(currentAgencyId ?? OWNER_VALUE);
  const [agentId, setAgentId] = useState(currentAgentId ?? NONE_VALUE);
  const selectedAgencyId = normalizeId(agencyId);
  const selectedAgentId = normalizeId(agentId);
  const selectedAgency = useMemo(
    () => agencyOptions.find((agency) => agency.id === selectedAgencyId) ?? null,
    [agencyOptions, selectedAgencyId],
  );
  const selectedAgent = useMemo(
    () => agentOptions.find((agent) => agent.id === selectedAgentId) ?? null,
    [agentOptions, selectedAgentId],
  );

  function submitTransfer() {
    setError(null);

    if (selectedAgencyId === currentAgencyId && selectedAgentId === currentAgentId) {
      setError("Select a different agency or listing agent before requesting transfer.");
      return;
    }

    startTransition(async () => {
      const result = await savePropertyChangeDraftAction({
        propertyId,
        status: "changing",
        data: {
          agency: selectedAgencyId,
          listingAgentAccountId: selectedAgentId ?? "",
        },
      });

      if (!result.success) {
        const message = result.error || "Failed to request listing transfer.";
        setError(message);
        toast({
          title: "Transfer request failed",
          description: message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Transfer requested",
        description: "Listing agency and agent changes were saved for review.",
      });
      router.push(`/manage/properties/${propertyId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Transfer cannot be submitted</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Agency</Label>
          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select agency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OWNER_VALUE}>No agency / owner listing</SelectItem>
              {agencyOptions.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {selectedAgency ? `Transfer listing agency to ${selectedAgency.name}.` : "Keep this listing outside an agency profile."}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Listing Agent</Label>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select listing agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>No listing agent</SelectItem>
              {agentOptions.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.agencyName ? `${agent.name} - ${agent.agencyName}` : agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {selectedAgent ? `Transfer listing agent to ${selectedAgent.name}.` : "No individual agent will be assigned."}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" asChild>
          <ClientLink href={`/manage/properties/${propertyId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to property
          </ClientLink>
        </Button>
        <Button type="button" onClick={submitTransfer} disabled={isPending}>
          <Send className="mr-2 h-4 w-4" />
          {isPending ? "Requesting..." : "Request Transfer"}
        </Button>
      </div>
    </div>
  );
}
