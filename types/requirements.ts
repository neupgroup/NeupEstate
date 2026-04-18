
import { z } from 'zod';
import { PropertyPurposeSchema, PropertyCategorySchema } from './property';

export const UrgencySchema = z.enum(['within a month', 'within 3 months', 'within 6 months', 'within a year', 'after a year']);
export const PaymentMethodSchema = z.enum(['Full Cash', 'Mortgage Support', 'Exchange']);

const emptyStringToUndefinedNumber = z.preprocess(
    (val) => {
        if (typeof val === 'string' && val.trim() === '') return undefined;
        if (val === null) return undefined;
        if (isNaN(Number(val))) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    },
    z.coerce.number().optional()
);

export const RequirementSchema = z.object({
  id: z.string(),
  userId: z.string(),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  location: z.string().optional(),
  propertyType: z.array(PropertyCategorySchema).optional(),
  urgency: UrgencySchema.optional(),
  paymentMethod: z.array(PaymentMethodSchema).optional(),
  requiredTime: UrgencySchema.optional(),
  purpose: PropertyPurposeSchema.optional(),
  loan: z.boolean().default(false).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const CreateRequirementSchema = z.object({
  userId: z.string().optional(),
  purpose: PropertyPurposeSchema.optional(),
  propertyType: z.array(PropertyCategorySchema).optional(),
  minBudget: emptyStringToUndefinedNumber,
  maxBudget: emptyStringToUndefinedNumber,
  location: z.string().optional(),
  paymentMethod: z.array(PaymentMethodSchema).optional(),
  requiredTime: UrgencySchema.optional(),
  loan: z.boolean().optional(),
});

export type CreateRequirementFormValues = z.infer<typeof CreateRequirementSchema>;
export type UpdateRequirementFormValues = CreateRequirementFormValues;
