import { redirect } from 'next/navigation';

export default function ManageUsersRedirectPage() {
  redirect('/manage/accounts');
}
