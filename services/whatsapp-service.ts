
'use server';

import { prisma } from '@/lib/prisma';
import type { WhatsAppTemplate, CreateWhatsAppTemplateInput, WhatsAppConfig } from '@/types';
import { logProblem } from './problem-service';

const CONFIG_DOC_ID = 'integration-config';

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
    try {
        const config = await prisma.whatsAppConfig.findUnique({
            where: { id: CONFIG_DOC_ID },
        });
        if (!config) return {};
        return {
            apiToken: config.apiToken || undefined,
            phoneNumberId: config.phoneNumberId || undefined,
            accountId: config.accountId || undefined,
            webhookVerifyToken: config.webhookVerifyToken || undefined,
        };
    } catch (error) {
        console.error('Error getting WhatsApp config:', error);
        return {};
    }
}

export async function updateWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
    try {
        await prisma.whatsAppConfig.upsert({
            where: { id: CONFIG_DOC_ID },
            create: {
                id: CONFIG_DOC_ID,
                apiToken: config.apiToken || null,
                phoneNumberId: config.phoneNumberId || null,
                accountId: config.accountId || null,
                webhookVerifyToken: config.webhookVerifyToken || null,
            },
            update: {
                apiToken: config.apiToken || null,
                phoneNumberId: config.phoneNumberId || null,
                accountId: config.accountId || null,
                webhookVerifyToken: config.webhookVerifyToken || null,
            },
        });
    } catch (error: any) {
        console.error('Error updating WhatsApp config:', error);
        throw new Error('Failed to update config.');
    }
}

export async function createWhatsAppTemplate(templateData: CreateWhatsAppTemplateInput): Promise<string> {
    const dataToSave = {
        ...templateData,
        // Set status based on whether it's pre-approved on Facebook's platform
        status: templateData.isPreapproved ? 'APPROVED' : 'PENDING',
        createdAt: new Date(),
    };

    const template = await prisma.whatsAppTemplate.create({
        data: {
            name: dataToSave.name,
            category: dataToSave.category,
            language: dataToSave.language,
            body: dataToSave.body,
            status: dataToSave.status,
            isPreapproved: Boolean(dataToSave.isPreapproved),
        },
    });
    return template.id;
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    try {
        const templates = await prisma.whatsAppTemplate.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return templates.map((template) => ({
            id: template.id,
            name: template.name,
            category: template.category as WhatsAppTemplate['category'],
            language: template.language as WhatsAppTemplate['language'],
            body: template.body,
            status: template.status as WhatsAppTemplate['status'],
            createdAt: template.createdAt.toISOString(),
            isPreapproved: template.isPreapproved,
        }));
    } catch (error) {
        console.error('Error getting WhatsApp templates from database: ', error);
        return [];
    }
}

export async function deleteWhatsAppTemplate(templateId: string): Promise<void> {
    await prisma.whatsAppTemplate.delete({ where: { id: templateId } });
}

export async function sendWhatsAppMessage(to: string, text: string) {
    const config = await getWhatsAppConfig();
    if (!config.apiToken || !config.phoneNumberId) {
        throw new Error("WhatsApp integration is not fully configured.");
    }
    const apiData = {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text },
    };

    console.log("--- WhatsApp API Request Body ---");
    console.log(JSON.stringify(apiData, null, 2));

    const response = await fetch(
        `https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiData)
        }
    );
    if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Unknown WhatsApp API Error';
        
        await logProblem(new Error(`WhatsApp API Error: ${errorMessage}`), 'sendWhatsAppMessage (WhatsApp API)', {
            method: 'POST',
            requestBody: apiData,
            responseBody: errorData,
        });
        
        throw new Error(`WhatsApp API Error: ${errorMessage}`);
    }
    return await response.json();
}
