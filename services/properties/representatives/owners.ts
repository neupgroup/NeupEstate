export type OwnerRepresentative = {
  id: string;
  type: 'owner';
  name: string | null;
  isPrimaryOwner: boolean;
};

type PropertyOwnerSummary = {
  ownerClientId?: string | null;
  clientName?: string | null;
  isPrimaryOwner?: boolean;
};

export function getPropertyOwnerRepresentatives(owners?: PropertyOwnerSummary[] | null): OwnerRepresentative[] {
  return (owners ?? [])
    .filter((owner): owner is PropertyOwnerSummary & { ownerClientId: string } => Boolean(owner.ownerClientId?.trim()))
    .map((owner) => ({
      id: owner.ownerClientId.trim(),
      type: 'owner',
      name: owner.clientName ?? null,
      isPrimaryOwner: Boolean(owner.isPrimaryOwner),
    }));
}
