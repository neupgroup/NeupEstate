

'use server';

/**
 * @fileOverview A unified service for generating text from various AI providers.
 *
 * This service abstracts the provider-specific logic for making AI calls.
 * The main entry point is the `generateText` function, which routes requests
 * to the appropriate provider based on the 'provider' parameter.
 */

import { ai, resolveGoogleModel } from '@/logica/core/ai/genkit';
import * as Handlebars from 'handlebars';
import { logProblem } from '@/services/problem-service';
import { z } from 'zod';

/**
 * Compiles a Handlebars prompt template with the given input data.
 * @param promptText The raw Handlebars template string.
 * @param input The data to inject into the template.
 * @returns The compiled prompt as a string.
 */
function compilePrompt(promptText: string, input: Record<string, any>): string {
    const template = Handlebars.compile(promptText);
    return template(input);
}


interface GenerateTextInput {
    model: string; // The model name, e.g., 'gemini-2.5-flash'
    promptText: string;
    inputData: Record<string, any>;
    outputSchema: z.ZodTypeAny;
}

/**
 * Unified function to generate text from a specified AI provider and model.
 * It compiles the prompt and sends the request to the Genkit `generate` API.
 *
 * @param {GenerateTextInput} options - The options for the text generation.
 * @returns A promise that resolves to the generated text content.
 */
export async function generateText<T>(options: GenerateTextInput): Promise<T> {
    const { model: modelIdentifier, promptText, inputData, outputSchema } = options;
    
    // Step 1: Compile the prompt with provided data
    const compiledPrompt = compilePrompt(promptText, inputData);

    let generatedJsonString: string;

    // Step 2: Make the generation call using the model identifier
    try {
        console.log(`Requesting response from model: ${modelIdentifier}`);
        
        const { output } = await ai.generate({
            model: resolveGoogleModel(modelIdentifier),
            prompt: compiledPrompt,
            output: {
                format: 'json',
                schema: z.any()
            }
        });

        if (typeof output === 'object') {
            generatedJsonString = JSON.stringify(output);
        } else {
            generatedJsonString = output as string;
        }

    } catch (error: any) {
        // Log the full error object for detailed debugging, including raw API responses.
        await logProblem(error, 'unified-generation-service', {
            model: modelIdentifier,
            errorDetails: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        });
        throw new Error(`AI generation failed: ${error.message}`);
    }


    // Step 3: Parse and validate the output against the provided Zod schema
    try {
        // Find the start of the JSON object/array
        const startIndex = generatedJsonString.indexOf('{');
        const arrayStartIndex = generatedJsonString.indexOf('[');
        
        let actualStartIndex = -1;
        
        if (startIndex !== -1 && arrayStartIndex !== -1) {
            actualStartIndex = Math.min(startIndex, arrayStartIndex);
        } else if (startIndex !== -1) {
            actualStartIndex = startIndex;
        } else {
            actualStartIndex = arrayStartIndex;
        }

        if (actualStartIndex === -1) {
            throw new Error("No JSON object or array found in the response string.");
        }
        
        // Find the end of the JSON object/array
        const lastBrace = generatedJsonString.lastIndexOf('}');
        const lastBracket = generatedJsonString.lastIndexOf(']');
        const actualEndIndex = Math.max(lastBrace, lastBracket);

        if (actualEndIndex === -1) {
            throw new Error("Could not find the end of the JSON object or array.");
        }

        const jsonString = generatedJsonString.substring(actualStartIndex, actualEndIndex + 1);

        const jsonOutput = JSON.parse(jsonString);
        return outputSchema.parse(jsonOutput) as T;
    } catch (error) {
         await logProblem(error, 'generateText-output-parsing', {
            model: modelIdentifier,
            rawOutput: generatedJsonString,
        });
        throw new Error('AI returned a response with an invalid format.');
    }
}
