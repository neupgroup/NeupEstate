
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
export type CreateConversationInput = CreateConversationFormValues;

// WhatsApp
export const WhatsAppTemplateCategorySchema = z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]);
export const WhatsAppTemplateLanguageSchema = z.enum(["af","sq","ar","ar_EG","ar_AE","ar_LB","ar_MA","ar_QA","az","be_BY","bn","bn_IN","bg","ca","zh_CN","zh_HK","zh_TW","hr","cs","da","prs_AF","nl","nl_BE","en","en_GB","en_US","en_AE","en_AU","en_CA","en_GH","en_IE","en_IN","en_JM","en_MY","en_NZ","en_QA","en_SG","en_UG","en_ZA","et","fil","fi","fr","fr_BE","fr_CA","fr_CH","fr_CI","fr_MA","ka","de","de_AT","de_CH","el","gu","ha","he","hi","hu","id","ga","it","ja","kn","kk","rw_RW","ko","ky_KG","lo","lv","lt","mk","ms","ml","mr","nb","ps_AF","fa","pl","pt_BR","pt_PT","pa","ro","ru","sr","si_LK","sk","sl","es","es_AR","es_CL","es_CO","es_CR","es_DO","es_EC","es_HN","es_MX","es_PA","es_PE","es_ES","es_UY","sw","sv","ta","te","th","tr","uk","ur","uz","vi","zu"]);

export const WhatsAppConfigSchema = z.object({
    apiToken: z.string().optional(),
    phoneNumberId: z.string().optional(),
    accountId: z.string().optional(),
    webhookVerifyToken: z.string().optional(),
});
export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;

export const CreateWhatsAppTemplateSchema = z.object({
  name: z.string().min(3, "Template name is required.").regex(/^[a-z0-9_]+$/, "Name can only contain lowercase letters, numbers, and underscores."),
  category: WhatsAppTemplateCategorySchema,
  language: WhatsAppTemplateLanguageSchema,
  body: z.string().min(1, "Template body is required."),
  isPreapproved: z.boolean().default(false),
});
export type CreateWhatsAppTemplateFormValues = z.infer<typeof CreateWhatsAppTemplateSchema>;
export type CreateWhatsAppTemplateInput = CreateWhatsAppTemplateFormValues;

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: z.infer<typeof WhatsAppTemplateCategorySchema>;
  language: z.infer<typeof WhatsAppTemplateLanguageSchema>;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  isPreapproved: boolean;
}

// Contact Submission
export const ContactSubmissionStatusSchema = z.enum(['new', 'read', 'archived']);

export const CreateContactSubmissionSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("A valid email is required."),
  phone: z.string().optional(),
  subject: z.string().min(3, "Subject is required."),
  body: z.string().min(10, "Message must be at least 10 characters long."),
});
export type CreateContactSubmissionFormValues = z.infer<typeof CreateContactSubmissionSchema>;

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
  status: z.infer<typeof ContactSubmissionStatusSchema>;
  createdAt: string; // ISO string
}

