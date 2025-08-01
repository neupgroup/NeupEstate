
import { getWhatsAppTemplates } from '@/services/whatsapp-service';
import { WhatsAppTemplatesClient } from '@/components/manage/whatsapp-templates-client';

export const dynamic = 'force-dynamic';

export default async function AdminWhatsAppTemplatesPage() {
  const templates = await getWhatsAppTemplates();

  return <WhatsAppTemplatesClient templates={templates} />;
}
