import { PropertyDetails } from './_propertyDetails';

export default async function ViewPropertyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PropertyDetails id={id} />;
}
