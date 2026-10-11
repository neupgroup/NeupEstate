import { redirect } from 'next/navigation';

export default function LegacyLeadCreatePage() {
    redirect('/manage/leads/add');
}
