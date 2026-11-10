
import { z } from 'zod';

// Inquiry
export const InquiryStatusSchema = z.enum(['new', 'replied', 'closed']);
export type InquiryStatus = z.infer<typeof InquiryStatusSchema>;

export const CreateInquirySchema = z.object({
  propertyId: z.string(),
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  question: z.string().min(10, "Your question must be at least 10 characters long."),
  submittedBy: z.string().optional(), // Verified accountId from gRPC session
});
export type CreateInquiryFormValues = z.infer<typeof CreateInquirySchema>;

export interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle: string; // denormalized for easy display
  agentName?: string; // denormalized
  name: string;
  email: string;
  phone?: string;
  question: string;
  submittedBy?: string; // Verified accountId
  createdAt: string; // ISO string
  status: InquiryStatus;
}

