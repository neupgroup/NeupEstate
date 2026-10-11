import { redirect } from 'next/navigation';

export default function LegacySingleLeadsPage() {
    redirect('/manage/leads/shared');
}
