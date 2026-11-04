export type OwnerRepresentative = {
  id: string;
  type: 'owner';
  name: string | null;
  isPrimaryOwner: boolean;
};

type ListingOwnerSummary = {
  ownerClientId?: string | null;
  clientName?: string | null;
  isPrimaryOwner?: boolean;
};

export function getListingOwnerRepresentatives(owners?: ListingOwnerSummary[] | null): OwnerRepresentative[] {
  return (owners ?? [])
    .filter((owner): owner is ListingOwnerSummary & { ownerClientId: string } => Boolean(owner.ownerClientId?.trim()))
    .map((owner) => ({
      id: owner.ownerClientId.trim(),
      type: 'owner',
      name: owner.clientName ?? null,
      isPrimaryOwner: Boolean(owner.isPrimaryOwner),
    }));
}
