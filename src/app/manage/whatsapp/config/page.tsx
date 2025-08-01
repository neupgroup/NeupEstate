
import { getWhatsAppConfig } from '@/services/whatsapp-service';
import { WhatsAppConfigForm } from '@/components/manage/whatsapp-config-form';
import { WebhookCallbackDisplay } from '@/components/manage/webhook-callback-display';

export const dynamic = 'force-dynamic';

export default async function ManageWhatsAppConfigPage() {
  const config = await getWhatsAppConfig();

  return (
    <div className="space-y-6">
        <WebhookCallbackDisplay />
        <WhatsAppConfigForm initialConfig={config} />
    </div>
  );
}
