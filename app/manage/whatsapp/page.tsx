
import { getWhatsAppTemplates, getWhatsAppConfig } from '@/services/whatsapp-service';
import { WhatsappIntegrationPageClient } from '@/components/manage/whatsapp-integration-client';

export const dynamic = 'force-dynamic';

export default async function ManageWhatsAppPage() {
  const templates = await getWhatsAppTemplates();
  const config = await getWhatsAppConfig();

  return <WhatsappIntegrationPageClient templates={templates} initialConfig={config} />;
}
