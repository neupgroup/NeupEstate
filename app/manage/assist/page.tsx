import { requireAuth } from '@/services/auth/account';
import { AssistChatbot } from './assist-chatbot';

export default async function ManageAssistPage() {
  const authAccount = await requireAuth();

  return <AssistChatbot userId={authAccount.aid} />;
}
