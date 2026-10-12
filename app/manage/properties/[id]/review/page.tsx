import { PropertyDetails } from '../_propertyDetails';

export default async function ReviewPropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PropertyDetails id={id} review />;
}
