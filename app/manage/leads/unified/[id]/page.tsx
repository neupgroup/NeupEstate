import { redirect } from 'next/navigation';

export default async function UnifiedLeadClientRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/manage/leads/base/${id}`);
}
