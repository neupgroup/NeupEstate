import { ListingDetails } from '../_listingDetails';

export default async function ReviewListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ListingDetails id={id} review />;
}
