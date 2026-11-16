'use server';

import * as Handlebars from 'handlebars';
import { createNiaResponse } from '@neup/logica/intelligence/responses';
import { z } from 'zod';

interface GenerateTextInput {
    model?: string;
    promptText: string;
    inputData: Record<string, any>;
    outputSchema: z.ZodTypeAny;
}

/** Compiles a prompt template with its flow-specific input values. */
function compilePrompt(promptText: string, input: Record<string, any>): string {
    return Handlebars.compile(promptText)(input);
}

/** Adds the shared structured-output requirement used by all AI flows. */
function addJsonOutputInstruction(prompt: string): string {
    return `${prompt}\n\nReturn only valid JSON matching the requested output. Do not wrap it in Markdown.`;
}

/** Extracts one JSON object or array from the model's text response. */
function parseJsonOutput(responseText: string): unknown {
    const normalizedResponse = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
        return JSON.parse(normalizedResponse) as unknown;
    } catch {
        const firstObject = normalizedResponse.indexOf('{');
        const firstArray = normalizedResponse.indexOf('[');
        const start = firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
        const last = Math.max(normalizedResponse.lastIndexOf('}'), normalizedResponse.lastIndexOf(']'));
        if (start < 0 || last < start) throw new Error('No complete JSON object or array was returned.');
        return JSON.parse(normalizedResponse.slice(start, last + 1)) as unknown;
    }
}

/** Sends a structured AI request through the shared Nia Assist response service. */
export async function generateText<T>(options: GenerateTextInput): Promise<T> {
    const compiledPrompt = compilePrompt(options.promptText, options.inputData);
    const response = await createNiaResponse({
        model: options.model?.trim() || 'auto',
        failover: true,
        stream: false,
        input: [
            { type: 'text', role: 'developer', text: addJsonOutputInstruction(compiledPrompt) },
            { type: 'text', role: 'user', text: `Input data: ${JSON.stringify(options.inputData)}` },
        ],
    });
    const responseText = response.data.output
        .filter((item) => item.type === 'text')
        .map((item) => item.value)
        .join('\n')
        .trim();
    if (!responseText) throw new Error('Nia returned no text.');

    try {
        return options.outputSchema.parse(parseJsonOutput(responseText)) as T;
    } catch {
        throw new Error('AI returned a response with an invalid format.');
    }
}
