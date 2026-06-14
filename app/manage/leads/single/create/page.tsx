import { redirect } from 'next/navigation';

export default function LegacySingleLeadCreatePage() {
  redirect('/manage/leads/add');
}
