import { redirect } from 'next/navigation';

export default function SharedLeadCreatePage() {
  redirect('/manage/leads/add');
}
