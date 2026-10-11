import { redirect } from 'next/navigation';

export default async function LegacyLeadActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/manage/leads/shared/${id}`);
}
