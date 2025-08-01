
'use server';

import { getFirestore } from '@/lib/firebase';
import type { WhatsAppTemplate, CreateWhatsAppTemplateInput, WhatsAppConfig } from '@/types';
import { logProblem } from './problem-service';

const CONFIG_DOC_ID = 'integration-config';

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
    const firestore = getFirestore();
    if (!firestore) return {};

    try {
        const docRef = await firestore.collection('whatsapp').doc(CONFIG_DOC_ID).get();
        if (!docRef.exists) {
            return {};
        }
        return docRef.data() as WhatsAppConfig;
    } catch (error) {
        console.error('Error getting WhatsApp config:', error);
        return {};
    }
}

export async function updateWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore not available');

    try {
        await firestore.collection('whatsapp').doc(CONFIG_DOC_ID).set(config, { merge: true });
    } catch (error: any) {
        console.error('Error updating WhatsApp config:', error);
        throw new Error('Failed to update config.');
    }
}

export async function createWhatsAppTemplate(templateData: CreateWhatsAppTemplateInput): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available.');

    const dataToSave = {
        ...templateData,
        // Set status based on whether it's pre-approved on Facebook's platform
        status: templateData.isPreapproved ? 'APPROVED' : 'PENDING',
        createdAt: new Date(),
    };

    const docRef = await firestore.collection('whatsappTemplates').add(dataToSave);
    return docRef.id;
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    const firestore = getFirestore();
    if (!firestore) return [];
    try {
        const snapshot = await firestore.collection('whatsappTemplates').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                category: data.category,
                language: data.language,
                body: data.body,
                status: data.status,
                createdAt: data.createdAt.toDate().toISOString(),
                isPreapproved: data.isPreapproved || false,
            }
        });
    } catch (error) {
        console.error('Error getting WhatsApp templates from Firestore: ', error);
        return [];
    }
}

export async function deleteWhatsAppTemplate(templateId: string): Promise<void> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available.');
    await firestore.collection('whatsappTemplates').doc(templateId).delete();
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
