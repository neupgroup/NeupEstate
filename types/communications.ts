
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

// Conversation & Message
export interface Conversation {
  id: string;
  userId?: string; // Link to the user/account ID
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAvatarUrl?: string;
  notes?: string; // Summary
  assignedTo: string; // Agent name
  isRead: boolean;
  subject: string;
  lastMessageAt: string; // ISO String
  lastMessageSnippet: string;
  lastMessageSender: 'agent' | 'customer';
  leadCategory?: 'New Inquiry' | 'Follow-up' | 'Negotiation' | 'General Question' | 'Other';
  leadScore?: number; // Score from 1-10
  aiInterventionActive?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'agent' | 'customer';
  text: string;
  timestamp: string; // ISO String
}

export const CreateConversationSchema = z.object({
  customerName: z.string().min(2, "Customer name is required."),
  customerPhone: z.string()
    .min(1, "A valid phone number is required.")
    .refine(phone => !/[a-zA-Z]/.test(phone), {
      message: "Phone number cannot contain letters.",
    })
    .transform(phone => phone ? phone.replace(/[\s.+-]/g, '') : phone)
    .refine(phone => phone.length >= 10 && phone.length <= 15, {
      message: "Phone number must be between 10 and 15 digits.",
    }),
  notes: z.string().min(5, "Please provide a brief summary or subject.").max(200, "Notes cannot exceed 200 characters."),
});
export type CreateConversationFormValues = z.infer<typeof CreateConversationSchema>;
export type CreateConversationInput = CreateConversationFormValues & {
  customerEmail?: string;
  customerAvatarUrl?: string;
  userId?: string;
};
