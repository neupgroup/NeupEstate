

'use server';

/**
 * @fileOverview An AI agent that generates and sends follow-up messages.
 *
 * - generateFollowUpMessages - Generates a sequence of follow-up messages.
 * - AiFollowUpInput - The input type for the function.
 * - AiFollowUpOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';

const ChatHistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AiFollowUpInputSchema = z.object({
  history: z.array(ChatHistoryItemSchema).describe('The history of the conversation so far.'),
  customerName: z.string().describe("The customer's name."),
});
export type AiFollowUpInput = z.infer<typeof AiFollowUpInputSchema>;

const AiFollowUpOutputSchema = z.object({
  messages: z.array(z.string()).min(1).max(5).describe("An array of 1 to 5 short, friendly, and persuasive follow-up messages to send to the user."),
});
export type AiFollowUpOutput = z.infer<typeof AiFollowUpOutputSchema>;

// Define the unique ID and default content for this prompt
const PROMPT_ID = 'aiFollowUpPrompt';
const defaultPrompt = {
    name: 'AI Follow-Up Agent',
    description: 'Generates contextual follow-up messages to re-engage clients.',
    placeholders: ['history', 'customerName'],
    promptText: `You are a master of persuasion and an expert real estate sales assistant. Your task is to re-engage a potential client, {{customerName}}, who has stopped responding. You will craft a sequence of 1 to 5 highly contextual and persuasive follow-up messages.

    **Core Principles:**
    1.  **Be Contextual, Not Repetitive:** Your follow-up messages MUST be directly based on the last topic of conversation. Do not send generic "just checking in" messages. Analyze the history to find the last point of interest (a specific property, a neighborhood, a budget question) and build your messages around that.
    2.  **Be Persuasive, Not Pushy:** Your goal is to gently nudge the conversation forward, not to pressure the user. Use techniques like offering new, valuable information, asking insightful open-ended questions, or creating a subtle sense of opportunity (e.g., "another client is looking at this property").
    3.  **Greet Smartly:** A polite greeting (like "Hi {{customerName}}") is appropriate for the *first* message in your follow-up sequence. For any subsequent messages in the same sequence, you must OMIT the greeting and get straight to the point to avoid sounding robotic.

    **Conversation History:**
    {{#each history}}
    - {{role}}: {{content}}
    {{/each}}

    **Your Task:**
    Generate a JSON object containing an array named "messages". This array should contain between 1 and 5 short, friendly, and persuasive follow-up message strings.

    **Example of a good persuasive sequence:**
    1.  "Hi {{customerName}}, just circling back on that lovely 3-bedroom on Elm Street we discussed. I realized I forgot to mention it has a newly renovated kitchen. Happy to send over some new photos if you're interested!"
    2.  (If no response) "A quick heads-up, we've had a couple more inquiries about the Elm Street property. No pressure at all, but I wanted to give you a chance to schedule a viewing if you're still considering it."
    3.  (If no response) "Was there something about the Elm Street property that didn't quite meet your needs? Your feedback would be super helpful for me to find you the perfect alternative."

    Now, generate a persuasive and contextual follow-up sequence for this specific conversation.
    `,
};


async function aiFollowUpFlow(input: AiFollowUpInput): Promise<AiFollowUpOutput> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    return generateText<AiFollowUpOutput>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: input,
        outputSchema: AiFollowUpOutputSchema,
    });
}


export async function generateFollowUpMessages(input: AiFollowUpInput): Promise<AiFollowUpOutput> {
    return aiFollowUpFlow(input);
}
