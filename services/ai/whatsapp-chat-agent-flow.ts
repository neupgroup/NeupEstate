

'use server';

/**
 * @fileOverview An AI agent that automatically responds to WhatsApp messages.
 *
 * - chatWithAi - Handles the AI chat response process.
 * - ChatWithAiInput - The input type for the chatWithAi function.
 * - ChatWithAiOutput - The return type for the chatWithAi function.
 */

import { z } from 'zod';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';
import { getAccountById } from '@/services/account-service';

const ChatHistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ChatWithAiInputSchema = z.object({
  history: z.array(ChatHistoryItemSchema).describe('The history of the conversation so far.'),
  newMessage: z.string().describe('The latest message from the user.'),
  userId: z.string().optional().describe("The user's account ID, if known."),
});
export type ChatWithAiInput = z.infer<typeof ChatWithAiInputSchema>;

const ChatWithAiOutputSchema = z.object({
  response: z.string().describe("The AI's generated response to send back to the user."),
  leadCategory: z.enum(['New Inquiry', 'Follow-up', 'Negotiation', 'General Question', 'Other']).describe("Categorize the user's last message."),
  leadScore: z.number().min(1).max(10).describe("A score from 1 (cold) to 10 (hot) indicating the user's interest level."),
  requiresSupervisor: z.boolean().describe("Set to true if the conversation requires a human supervisor, for example, for negotiation. Otherwise, set to false."),
});
export type ChatWithAiOutput = z.infer<typeof ChatWithAiOutputSchema>;

const PROMPT_ID = 'whatsAppChatAgentPrompt';
const defaultPrompt = {
    name: 'WhatsApp Chat Agent',
    description: 'Acts as a real estate assistant, responding to user inquiries via WhatsApp.',
    placeholders: ['history', 'newMessage', 'userProfile'],
    promptText: `You are a friendly, professional, and helpful AI real estate assistant for 'Neup.Estate'. Your goal is to engage potential clients, understand their needs, and determine if they are a hot lead. You must be multilingual and respond in the same language as the user's last message.

    Current Conversation History:
    {{#each history}}
    - {{role}}: {{content}}
    {{/each}}

    New User Message: "{{newMessage}}"
    
    {{#if userProfile}}
    Known User Information:
    \`\`\`json
    {{{userProfile}}}
    \`\`\`
    {{/if}}

    Your tasks are:
    1.  **Analyze the Message**: Read the new user message in the context of the conversation history and any known user information.
    2.  **Check for Negotiation**: If the message is about price negotiation, bargaining, or making a formal offer, you MUST transfer to a human. Set \`requiresSupervisor\` to \`true\` and your \`response\` should be a polite message like, "That's a great question. Let me connect you with one of our senior agents to discuss that further. They will get back to you shortly."
    3.  **Generate a Response**: If it's not a negotiation, craft a helpful, sales-friendly response. Answer their questions if possible. If you don't know the answer, say you will find out. Keep the conversation going.
    4.  **Categorize the Lead**: Classify the user's message into one of these categories: 'New Inquiry', 'Follow-up', 'Negotiation', 'General Question', 'Other'.
    5.  **Score the Lead**: Assign a \`leadScore\` from 1 (very cold, just browsing) to 10 (very hot, ready to buy/rent). Base this score on their language, urgency, and specificity of their request.
    6.  **User Profile Creation**: If the user provides personal details (like budget, location preferences, etc.) and there is no existing user profile, use those details to implicitly build a user profile.

    Return your analysis and response in the specified JSON format.
    `,
};


async function whatsappChatAgentFlow(input: ChatWithAiInput): Promise<ChatWithAiOutput> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);

    let userProfile = null;
    if (input.userId) {
        userProfile = await getAccountById(input.userId);
    }
    
    const inputForPrompt = {
        ...input,
        userProfile: userProfile ? JSON.stringify(userProfile, null, 2) : undefined,
    }

    return generateText<ChatWithAiOutput>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: inputForPrompt,
        outputSchema: ChatWithAiOutputSchema,
    });
}

export async function chatWithAi(input: ChatWithAiInput): Promise<ChatWithAiOutput> {
    return whatsappChatAgentFlow(input);
}
