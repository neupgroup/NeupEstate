
import { getFaqs } from '@/services/faq-service';
import { FaqAdminClient } from '@/components/manage/faq-admin-client';
import type { FAQ } from '@/types';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';

export default async function ManageFaqPage() {
    await requirePagePermission(PERMISSIONS.manage.faqView);
    const faqs = await getFaqs();
    
    // Group FAQs by category
    const groupedFaqs = faqs.reduce((acc, faq) => {
        const category = faq.category || 'General';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(faq);
        return acc;
    }, {} as Record<string, FAQ[]>);
    
    return <FaqAdminClient initialFaqs={groupedFaqs} />;
}
