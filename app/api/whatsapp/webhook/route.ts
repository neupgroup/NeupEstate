
import { NextRequest, NextResponse } from 'next/server';
import { getConversationByPhone, createMessage, createConversation, getMessagesByConversationId, updateConversationAiStatus, getConversationById } from '@/services/conversation-service';
import { logProblem } from '@/services/problem-service';
import { getWhatsAppConfig, sendWhatsAppMessage } from '@/services/whatsapp-service';
import { chatWithAi } from '@/services/ai/whatsapp-chat-agent-flow';
import { createTemporaryAccount, updateAccountAccess } from '@/services/account-service';

export const dynamic = 'force-dynamic';

// Handle the webhooks verification GET request from Meta
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const config = await getWhatsAppConfig();
    const verifyToken = config.webhookVerifyToken;

    if (!verifyToken) {
        const errorMessage = "Webhook verification failed: No verify token is configured in the admin settings.";
        console.error(errorMessage);
        await logProblem(new Error(errorMessage), 'WhatsApp Webhook Verification');
        return new NextResponse('Forbidden: Token not configured', { status: 403 });
    }

    if (mode === 'subscribe' && token === verifyToken) {
        console.log("Webhook verified successfully!");
        return new NextResponse(challenge, { status: 200 });
    } else {
        const errorMessage = "Webhook verification failed. The token from Meta did not match the one in the database.";
        console.error(errorMessage);
        await logProblem(new Error(errorMessage), 'WhatsApp Webhook Verification');
        return new NextResponse('Forbidden: Mismatched token', { status: 403 });
    }
}

// Handle incoming message notifications POST request from Meta
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Check if it's a valid WhatsApp message notification
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];
        const contact = change?.value?.contacts?.[0];

        if (body.object === 'whatsapp_business_account' && message && message.type === 'text') {
            const from = message.from; // Customer's phone number
            const text = message.text.body;
            const customerName = contact?.profile?.name || 'Unknown User';

            let conversation = await getConversationByPhone(from);
            let accountId: string | undefined = undefined;

            if (!conversation) {
                accountId = await createTemporaryAccount(req.headers.get("x-forwarded-for") || 'unknown');

                const newConversationId = await createConversation({
                    customerName: customerName,
                    customerPhone: from,
                    notes: `New incoming chat. First message: "${text}"`,
                });
                conversation = await getConversationById(newConversationId);
            } else {
                accountId = conversation.userId;
            }

            if (!conversation) {
                 await logProblem(new Error("Failed to find or create conversation for incoming message."), 'WhatsApp Webhook Processing');
                 return new NextResponse('Error: Conversation could not be handled.', { status: 500 });
            }

            // Save the customer's message first
            await createMessage(conversation.id, text, 'customer');
            
            if (accountId) {
                await updateAccountAccess(accountId, req.headers.get("x-forwarded-for") || 'unknown');
            }


            // Check if AI intervention is active for this chat
            if (conversation.aiInterventionActive === false) {
                console.log(`AI intervention is disabled for conversation ${conversation.id}. No AI response will be sent.`);
                return new NextResponse('OK (AI intervention disabled)', { status: 200 });
            }

            // Prepare history for AI
            const messageHistory = await getMessagesByConversationId(conversation.id);
            const formattedHistory = messageHistory.map(msg => ({
                role: msg.sender === 'customer' ? 'user' : ('model' as 'user' | 'model'),
                content: msg.text
            }));

            // Call the AI agent
            const aiResult = await chatWithAi({
                history: formattedHistory,
                newMessage: text,
                userId: accountId
            });

            if (aiResult && aiResult.response) {
                // Send AI response via WhatsApp
                await sendWhatsAppMessage(conversation.customerPhone, aiResult.response);
                // Save AI response to our DB
                await createMessage(conversation.id, aiResult.response, 'agent');
            }

            // Update conversation metadata
            if (aiResult) {
                await updateConversationAiStatus(conversation.id, {
                    leadCategory: aiResult.leadCategory,
                    leadScore: aiResult.leadScore,
                    aiInterventionActive: !aiResult.requiresSupervisor
                });
            }
        }

        return new NextResponse('OK', { status: 200 });
    } catch (error: any) {
        await logProblem(error, 'WhatsApp Webhook Processing');
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
