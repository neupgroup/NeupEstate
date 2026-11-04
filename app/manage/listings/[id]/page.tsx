import { ListingDetails } from './_listingDetails';

export default async function ViewListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ListingDetails id={id} />;
}
