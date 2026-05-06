
import { z } from 'zod';

// Mortgage Request
export const MortgageRequestStatusSchema = z.enum(['new', 'contacted', 'in-progress', 'closed']);
export const ContactMethodSchema = z.enum(['call', 'email', 'whatsapp']);

export const CreateMortgageRequestSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(1, "Phone number is required."),
  address: z.string().min(5, "Address is required."),
  age: z.coerce.number().min(18, "You must be at least 18 years old.").max(100, "Please enter a valid age."),
  income: z.coerce.number().min(1, "Please enter your approximate annual income."),
  moreDetails: z.string().optional(),
  contactMethods: z.array(ContactMethodSchema).nonempty({ message: "Please select at least one contact method." }),
  submittedBy: z.string().optional(), // Verified accountId from gRPC session
});

export type CreateMortgageRequestFormValues = z.infer<typeof CreateMortgageRequestSchema>;

export interface MortgageRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  age: number;
  income: number;
  moreDetails?: string;
  contactMethods: z.infer<typeof ContactMethodSchema>[];
  submittedBy?: string; // Verified accountId
  status: z.infer<typeof MortgageRequestStatusSchema>;
  createdAt: string; // ISO string
}
