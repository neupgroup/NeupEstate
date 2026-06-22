'use server';

import { z } from 'zod';
import { chatWithAi } from '@/services/ai/whatsapp-chat-agent-flow';

const AssistMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});

const AskAssistInputSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(AssistMessageSchema).max(20),
  userId: z.string().trim().min(1).optional(),
});

export async function askAssistAction(input: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
}): Promise<{
  success: boolean;
  response?: string;
  error?: string;
}> {
  try {
    const validated = AskAssistInputSchema.parse(input);

    const result = await chatWithAi({
      newMessage: validated.message,
      userId: validated.userId,
      history: validated.history.map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        content: entry.content,
      })),
    });

    return {
      success: true,
      response: result.response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get assistant response.',
    };
  }
}
