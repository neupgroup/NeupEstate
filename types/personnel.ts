

import { z } from 'zod';

// Agency
export interface Agency {
  id: string;
  name: string; // Display Name
  logoUrl: string;
  website?: string;
  registeredName?: string;
  contactEmail?: string;
  contactPhone?: string;
  mainLocation?: string;
  branches?: string[];
  description?: string;
  contactPersonName?: string;
  contactPersonRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CreateAgencySchema = z.object({
  name: z.string().min(2, { message: "Agency name must be at least 2 characters long." }),
  registeredName: z.string().optional(),
  logoUrl: z.string().url({ message: "Please enter a valid URL for the logo." }),
  website: z.string().url({ message: "Please enter a valid website URL." }).optional().or(z.literal('')),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  mainLocation: z.string().optional(),
  branches: z.string().optional(), // Raw string from textarea
  contactPersonName: z.string().optional(),
  contactPersonRole: z.string().optional(),
});
export const UpdateAgencySchema = CreateAgencySchema;
export type CreateAgencyFormValues = z.infer<typeof CreateAgencySchema>;
export type UpdateAgencyFormValues = CreateAgencyFormValues;
export type CreateAgencyInput = Omit<CreateAgencyFormValues, 'branches'> & {
  branches: string[];
};
export type UpdateAgencyInput = CreateAgencyInput;

// ── AgencyMap ────────────────────────────────────────────────────────────────

export const AgencyMapRoleSchema = z.enum(['admin', 'agent', 'viewer']);
export type AgencyMapRole = z.infer<typeof AgencyMapRoleSchema>;

export interface AgencyMap {
  id: string;
  agencyAccountId: string; // references Agency.id (the agency's account)
  accountId: string;       // references Account.id (the member)
  role: AgencyMapRole;
  lockIn: boolean;
}

export const CreateAgencyMapSchema = z.object({
  agencyAccountId: z.string().min(1, 'Agency is required.'),
  accountId: z.string().min(1, 'Account is required.'),
  role: AgencyMapRoleSchema,
  lockIn: z.boolean().default(false),
});
export type CreateAgencyMapInput = z.infer<typeof CreateAgencyMapSchema>;

// ── AgencyAgentMap ───────────────────────────────────────────────────────────

export interface AgencyAgentMap {
  id: string;
  agencyId: string; // references Account.id (agency account)
  agentId: string;  // references Account.id (agent account)
  status: 'invited';
}

export const CreateAgencyAgentMapSchema = z.object({
  agencyId: z.string().min(1, 'Agency is required.'),
  agentId: z.string().min(1, 'Agent is required.'),
  status: z.literal('invited').default('invited'),
});
export type CreateAgencyAgentMapInput = z.infer<typeof CreateAgencyAgentMapSchema>;

// ── AgencyCustomization ──────────────────────────────────────────────────────

export const AgencyCustomizeForSchema = z.enum(['lead', 'property']);
export type AgencyCustomizeFor = z.infer<typeof AgencyCustomizeForSchema>;

/** The shape stored in the `customization` JSON column */
export const AgencyCustomizationRuleSchema = z.object({
  required: z.array(z.string()).default([]),
  optional: z.array(z.string()).default([]),
});
export type AgencyCustomizationRule = z.infer<typeof AgencyCustomizationRuleSchema>;

export interface AgencyCustomization {
  id: string;
  agencyId: string;
  customizeFor: AgencyCustomizeFor;
  customization: AgencyCustomizationRule;
  createdAt: string;
  updatedAt: string;
}

export const CreateAgencyCustomizationSchema = z.object({
  agencyId: z.string().min(1, 'Agency is required.'),
  customizeFor: AgencyCustomizeForSchema,
  customization: AgencyCustomizationRuleSchema,
});
export type CreateAgencyCustomizationInput = z.infer<typeof CreateAgencyCustomizationSchema>;

// User
const UserEmailSchema = z.object({
    type: z.enum(['primary', 'work', 'other']).default('primary'),
    value: z.string().email('Invalid email address'),
});
const UserPhoneSchema = z.object({
    type: z.enum(['primary', 'work', 'mobile', 'whatsapp']).default('primary'),
    value: z.string().min(10, 'Phone number seems too short'),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.array(UserEmailSchema).optional(),
  phone: z.array(UserPhoneSchema).optional(),
  location: z.string().optional(),
  role: z.enum(['Admin', 'Agent', 'User']).default('User'),
  lastLogin: z.string().optional(), // ISO 8601 date string
  avatarUrl: z.string().url().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const UpdateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').or(z.literal('')),
  email: z.array(UserEmailSchema).optional(),
  phone: z.array(UserPhoneSchema).optional(),
  location: z.string().optional(),
});
export type UpdateUserFormValues = z.infer<typeof UpdateUserSchema>;


// Agent
export interface AgentContact {
    email?: string;
    phone?: string;
}

export interface Agent {
    id: string;
    name: string;
    slug: string;
    location: string;
    registered: boolean;
    contact: AgentContact;
    userId?: string;
    photoUrl?: string;
    about?: string;
    specializations?: string[];
    // New availability fields
    availability_hours?: string; // e.g., "9-17" for 9am to 5pm
    time_slot_duration?: number; // in minutes, e.g., 60
    unavailability?: {
        dates?: string[]; // "YYYY-MM-DD"
        times?: { date: string; time: string }[]; // date is "YYYY-MM-DD", time is "HH:mm"
    };
}

const registeredAgentSchema = z.object({
    registered: z.literal(true),
    userId: z.string({ required_error: "Please select a registered user." }).min(1, "Please select a user."),
    location: z.string().min(1, "Location is required."),
    about: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    photoUrl: z.string().optional(),
    specializations: z.string().optional(),
    availability_hours: z.string().regex(/^\d{1,2}-\d{1,2}$/, "Format must be HH-HH, e.g., 9-17").optional().or(z.literal('')),
    time_slot_duration: z.coerce.number().optional(),
    unavailability: z.any().optional(), // Simplified for form handling
});

const manualAgentSchema = z.object({
    registered: z.literal(false),
    userId: z.string().optional(),
    name: z.string().min(2, "Name is required for manual entry."),
    email: z.string().email({ message: "Please enter a valid email." }),
    phone: z.string().optional(),
    location: z.string().min(1, "Location is required."),
    about: z.string().optional(),
    photoUrl: z.string().url({ message: "Please enter a valid photo URL." }).optional().or(z.literal('')),
    specializations: z.string().optional(),
    availability_hours: z.string().regex(/^\d{1,2}-\d{1,2}$/, "Format must be HH-HH, e.g., 9-17").optional().or(z.literal('')),
    time_slot_duration: z.coerce.number().optional(),
    unavailability: z.any().optional(), // Simplified for form handling
});

export const CreateAgentSchema = z.discriminatedUnion("registered", [
    registeredAgentSchema,
    manualAgentSchema,
]);

export type CreateAgentFormValues = z.infer<typeof CreateAgentSchema>;
export const UpdateAgentSchema = CreateAgentSchema;
export type UpdateAgentFormValues = z.infer<typeof CreateAgentSchema>;

// Team Member
export const SocialMediaLinksSchema = z.object({
  linkedin: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  facebook: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
});
export type SocialMediaLinks = z.infer<typeof SocialMediaLinksSchema>;

export interface TeamMember {
  id: string;
  orgId?: string; // Not using orgs yet, but good to have
  userId?: string;
  name: string;
  slug: string;
  position: string;
  socialMedia: SocialMediaLinks;
  about: string;
  moreDetails?: string;
  photoUrl?: string;
  registered: boolean;
}

const registeredTeamMemberSchema = z.object({
    registered: z.literal(true),
    userId: z.string({ required_error: "Please select a registered user." }).min(1, "Please select a user."),
    position: z.string().min(2, "Position is required."),
    about: z.string().min(10, "About text must be at least 10 characters long."),
    moreDetails: z.string().optional(),
    socialMedia: SocialMediaLinksSchema.optional(),
    name: z.string().optional(),
    photoUrl: z.string().optional(),
});

const manualTeamMemberSchema = z.object({
    registered: z.literal(false),
    userId: z.string().optional(),
    name: z.string().min(2, "Name is required for manual entry."),
    position: z.string().min(2, "Position is required."),
    photoUrl: z.string().url({ message: "Please enter a valid photo URL." }).optional().or(z.literal('')),
    about: z.string().min(10, "About text must be at least 10 characters long."),
    moreDetails: z.string().optional(),
    socialMedia: SocialMediaLinksSchema.optional(),
});

export const CreateTeamMemberSchema = z.discriminatedUnion("registered", [
    registeredTeamMemberSchema,
    manualTeamMemberSchema,
]);

export type CreateTeamMemberFormValues = z.infer<typeof CreateTeamMemberSchema>;
export const UpdateTeamMemberSchema = CreateTeamMemberSchema;
export type UpdateTeamMemberFormValues = z.infer<typeof CreateTeamMemberSchema>;

// Review
export interface Review {
  id: string;
  reviewedBy: string;
  rating: number; // 1-5
  review: string;
  reviewedOn: string; // ISO string
  response?: string;
  responseBy?: string;
  responseOn?: string; // ISO string
}
