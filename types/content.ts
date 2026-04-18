
import { z } from 'zod';

// FAQ
export const FaqCategorySchema = z.enum(["General", "Buying", "Selling", "Renting", "Technical"]);

export const CreateFaqSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters long."),
  answer: z.string().min(10, "Answer must be at least 10 characters long."),
  category: FaqCategorySchema,
});
export type CreateFaqFormValues = z.infer<typeof CreateFaqSchema>;
export const UpdateFaqSchema = CreateFaqSchema;
export type UpdateFaqFormValues = CreateFaqFormValues;

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: z.infer<typeof FaqCategorySchema>;
  createdAt: string;
}

// Prompt
const camelCaseRegex = /^[a-z]+([A-Z][a-z]*)*$/;

export const CreatePromptSchema = z.object({
  id: z.string().min(3, "ID must be at least 3 characters.").regex(camelCaseRegex, "ID must be in camelCase format (e.g., myPromptName)."),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  promptText: z.string().min(20, "Prompt text is too short."),
  placeholders: z.string().optional(), // Comma-separated string from form
  model: z.string().optional(),
});
export type CreatePromptFormValues = z.infer<typeof CreatePromptSchema>;


export const UpdatePromptSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  promptText: z.string().min(20, "Prompt text is too short."),
  placeholders: z.string().optional(), // Comma-separated string from form
  model: z.string().optional(),
});
export type UpdatePromptFormValues = z.infer<typeof UpdatePromptSchema>;


// AI Model
export const CreateAIModelSchema = z.object({
  modelId: z.string().min(3, "Model ID is required (e.g., gemini-2.5-flash)."),
  name: z.string().min(3, "Display Name is required."),
  description: z.string().min(10, "Description is required."),
  costPerMillionInputTokens: z.coerce.number().min(0, "Cost must be a positive number."),
  costPerMillionOutputTokens: z.coerce.number().min(0, "Cost must be a positive number."),
  isDefault: z.boolean().optional(),
});
export type CreateAIModelFormValues = z.infer<typeof CreateAIModelSchema>;

export const UpdateAIModelSchema = CreateAIModelSchema.extend({
    id: z.string(),
});
export type UpdateAIModelFormValues = z.infer<typeof UpdateAIModelSchema>;

export interface AIModel {
    id: string;
    modelId: string; // The configured model identifier, e.g., 'gemini-2.5-flash'
    name: string; // The user-friendly display name, e.g., 'Gemini 2.5 Flash'
    description: string;
    costPerMillionInputTokens: number;
    costPerMillionOutputTokens: number;
    isDefault?: boolean;
}
